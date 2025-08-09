import {
    getEmployees, getShifts, addShift, updateShift, deleteShift, getShift,
    addEmployee, updateEmployee, deleteEmployee, getEmployee, getPtoRequests,
    updatePtoRequestStatus, addPtoRequest, getPtoRequestById, addShiftBid,
    getShiftBids, updateShiftBidStatus, assignShiftToEmployee, signOutUser
} from './api.js';

let currentUser = null;
let toastTimer;

function showToast(message, isError = false) {
    const toastContainer = document.getElementById('toast-container');
    toastContainer.textContent = message;
    toastContainer.style.backgroundColor = isError ? '#f44336' : '#333';
    toastContainer.className = 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastContainer.className = toastContainer.className.replace('show', ''); }, 3000);
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

export function initUI(user) {
    try {
        currentUser = user;
        renderCalendar();

        // --- Role-Based UI Adjustments ---
        if (currentUser && currentUser.role !== 'admin') {
            document.getElementById('quadrant-employees').style.display = 'none';
            document.getElementById('quadrant-bids').style.display = 'none';
        } else {
            // --- Admin-Only Quadrant Click Listeners ---
            document.getElementById('quadrant-employees').addEventListener('click', () => {
                openModal('employees-modal');
                renderAddEmployeeForm();
                renderEmployeeList();
            });
            document.getElementById('quadrant-bids').addEventListener('click', () => {
                openModal('bids-modal');
                renderShiftBidsDashboard();
            });
        }

        // --- Quadrant Click Listeners for All Roles ---
        document.getElementById('quadrant-shifts').addEventListener('click', () => {
            openModal('shifts-modal');
            renderAddShiftForm(); // Gated inside the function
            renderShiftList();
        });
        document.getElementById('quadrant-pto').addEventListener('click', () => {
            openModal('pto-modal');
            renderPtoRequestForm();
            renderPtoDashboard();
        });

        document.getElementById('sign-out-btn').addEventListener('click', async () => {
            const { error } = await signOutUser();
            if (error) {
                showToast('Error signing out.', true);
            } else {
                window.location.href = '/login.html';
            }
        });

        // --- Modal Close Buttons ---
        document.querySelectorAll('.modal .close-btn, .modal .close-btn-employee').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // --- Online/Offline Status ---
        const statusIndicator = document.getElementById('status-indicator');
        function updateStatus() {
            if (navigator.onLine) {
                statusIndicator.textContent = '🟢 Connected';
                statusIndicator.style.backgroundColor = '#4CAF50';
                showToast('You are back online.');
            } else {
                statusIndicator.textContent = '🔴 Offline';
                statusIndicator.style.backgroundColor = '#f44336';
                showToast('You are currently offline.');
            }
        }
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        window.addEventListener('syncComplete', () => {
            showToast('Offline changes have been synced.');
            renderShiftList();
            if (currentUser && currentUser.role === 'admin') {
                renderEmployeeList();
                renderShiftBidsDashboard();
            }
            renderPtoDashboard();
            renderCalendar();
        });
        if (navigator.onLine) {
            statusIndicator.textContent = '🟢 Connected';
            statusIndicator.style.backgroundColor = '#4CAF50';
        } else {
            statusIndicator.textContent = '🔴 Offline';
            statusIndicator.style.backgroundColor = '#f44336';
        }

        // --- Event Listeners for Modals ---
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        });

        // --- Keyboard Shortcuts ---
        document.addEventListener('keydown', (event) => {
            if (currentUser && currentUser.role === 'admin') {
                if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
                    event.preventDefault();
                    openModal('employees-modal');
                    renderAddEmployeeForm();
                }
            }

            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                const forms = document.querySelectorAll('form');
                forms.forEach(form => {
                    if (form.closest('.modal').style.display === 'block') {
                        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }
                });
            }
        });
    } catch (e) {
        console.error("Failed to initialize UI", e);
        showToast("A critical error occurred while loading the application. See console for details.", true);
    }
}

async function renderAddEmployeeForm() {
    if (currentUser && currentUser.role !== 'admin') {
        document.getElementById('add-employee-form-container').innerHTML = '';
        return;
    }
    const container = document.getElementById('add-employee-form-container');
    container.innerHTML = `
        <h2>Add New Employee</h2>
        <form id="add-employee-form">
            <label for="employee-name">Name:</label>
            <input type="text" id="employee-name" name="name" required>
            <label for="employee-email">Email:</label>
            <input type="email" id="employee-email" name="email" required>
            <button type="submit">Add Employee</button>
        </form>
    `;
    document.getElementById('add-employee-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = e.target.name.value;
        const email = e.target.email.value;
        await addEmployee({ name, email });
        e.target.reset();
        renderEmployeeList();
    });
}

async function renderEmployeeList() {
    if (currentUser && currentUser.role !== 'admin') {
        document.getElementById('employee-list-container').innerHTML = '';
        return;
    }
    const { data: employees, error } = await getEmployees();
    if (error) {
        showToast('Error fetching employees', true);
        return;
    }
    const container = document.getElementById('employee-list-container');
    container.innerHTML = `
        <h2>Employee List</h2>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${employees.map(emp => `
                    <tr>
                        <td>${emp.name}</td>
                        <td>${emp.email || ''}</td>
                        <td>
                            <button class="edit-employee-btn" data-id="${emp.id}">Edit</button>
                            <button class="delete-employee-btn" data-id="${emp.id}">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.querySelectorAll('.delete-employee-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this employee?')) {
                await deleteEmployee(id);
                renderEmployeeList();
            }
        });
    });
    container.querySelectorAll('.edit-employee-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            const { data: employee } = await getEmployee(id);
            document.getElementById('edit-employee-id').value = employee.id;
            document.getElementById('edit-employee-name').value = employee.name;
            document.getElementById('edit-employee-email').value = employee.email;
            openModal('edit-employee-modal');
        });
    });
}

async function renderAddShiftForm() {
    const container = document.getElementById('add-shift-form-container');
    if (currentUser && currentUser.role !== 'admin') {
        container.innerHTML = '';
        return;
    }
    const { data: employees } = await getEmployees();
    container.innerHTML = `
        <h2>Add New Shift</h2>
        <form id="add-shift-form">
            <label for="shift-date">Date:</label>
            <input type="date" id="shift-date" name="shift_date" required>
            <label for="start-time">Start Time:</label>
            <input type="time" id="start-time" name="start_time" required>
            <label for="end-time">End Time:</label>
            <input type="time" id="end-time" name="end_time" required>
            <label for="employee-select">Assign to (optional):</label>
            <select id="employee-select" name="employee_id">
                <option value="">Unassigned</option>
                ${employees.map(emp => `<option value="${emp.id}">${emp.name}</option>`).join('')}
            </select>
            <button type="submit">Add Shift</button>
        </form>
    `;
    document.getElementById('add-shift-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const shiftData = {
            shift_date: e.target.shift_date.value,
            start_time: e.target.start_time.value,
            end_time: e.target.end_time.value,
            employee_id: e.target.employee_id.value || null
        };
        await addShift(shiftData);
        e.target.reset();
        renderShiftList();
        renderCalendar();
    });
}

async function handleBid(shiftId) {
    if (!currentUser) {
        showToast('You must be logged in to bid.', true);
        return;
    }
    try {
        const bidData = {
            shift_id: shiftId,
            employee_id: currentUser.id,
            status: 'pending'
        };
        await addShiftBid(bidData);
        showToast('Bid placed successfully!');
        renderShiftList(); // Refresh the list to show the bid status or remove the button
    } catch (error) {
        showToast(`Error placing bid: ${error.message}`, true);
    }
}

async function renderShiftList() {
    const { data: shifts, error } = await getShifts();
    if (error) {
        showToast('Error fetching shifts', true);
        return;
    }
    const container = document.getElementById('shift-list-container');
    container.innerHTML = `
        <h2>Shift List</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Assigned To</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${shifts.map(shift => `
                    <tr>
                        <td>${shift.shift_date}</td>
                        <td>${shift.start_time} - ${shift.end_time}</td>
                        <td>${shift.employees ? shift.employees.name : 'Unassigned'}</td>
                        <td class="actions-cell" data-shift-id="${shift.id}" data-employee-id="${shift.employee_id}">
                            <!-- Action buttons will be injected here -->
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.querySelectorAll('.actions-cell').forEach(cell => {
        const shiftId = cell.dataset.shiftId;
        const employeeId = cell.dataset.employeeId;

        if (currentUser && currentUser.role === 'admin') {
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'edit-shift-btn';
            editButton.onclick = async () => {
                const { data: shift } = await getShift(shiftId);
                document.getElementById('edit-shift-id').value = shift.id;
                document.getElementById('edit-shift-date').value = shift.shift_date;
                document.getElementById('edit-start-time').value = shift.start_time;
                document.getElementById('edit-end-time').value = shift.end_time;
                openModal('edit-shift-modal');
            };
            cell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-shift-btn';
            deleteButton.onclick = async () => {
                if (confirm('Are you sure you want to delete this shift?')) {
                    await deleteShift(shiftId);
                    renderShiftList();
                    renderCalendar();
                }
            };
            cell.appendChild(deleteButton);
        } else if (!employeeId) { // Employee view, shift is unassigned
            const bidButton = document.createElement('button');
            bidButton.textContent = 'Bid';
            bidButton.className = 'bid-btn';
            bidButton.onclick = () => handleBid(shiftId);
            cell.appendChild(bidButton);
        }
    });
}

async function renderPtoRequestForm() {
    const container = document.getElementById('add-pto-request-form-container');
    container.innerHTML = `
        <h2>Request Paid Time Off</h2>
        <form id="add-pto-request-form">
            <label for="pto-start-date">Start Date:</label>
            <input type="date" id="pto-start-date" name="start_date" required>
            <label for="pto-end-date">End Date:</label>
            <input type="date" id="pto-end-date" name="end_date" required>
            <label for="pto-reason">Reason:</label>
            <textarea id="pto-reason" name="reason"></textarea>
            <button type="submit">Submit Request</button>
        </form>
    `;
    document.getElementById('add-pto-request-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const requestData = {
            employee_id: currentUser.id,
            start_date: e.target.start_date.value,
            end_date: e.target.end_date.value,
            reason: e.target.reason.value,
            status: 'pending'
        };
        await addPtoRequest(requestData);
        e.target.reset();
        renderPtoDashboard();
    });
}

async function renderPtoDashboard() {
    const { data: requests, error } = await getPtoRequests();
    if (error) {
        showToast('Error fetching PTO requests', true);
        return;
    }
    const container = document.getElementById('pto-dashboard-container');
    const requestsToShow = (currentUser.role === 'admin')
        ? requests
        : requests.filter(r => r.employee_id === currentUser.id);

    container.innerHTML = `
        <h2>${currentUser.role === 'admin' ? 'PTO Dashboard' : 'My PTO Requests'}</h2>
        <table>
            <thead>
                <tr>
                    ${currentUser.role === 'admin' ? '<th>Employee</th>' : ''}
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${requestsToShow.map(req => `
                    <tr>
                        ${currentUser.role === 'admin' ? `<td>${req.employees ? req.employees.name : 'N/A'}</td>` : ''}
                        <td>${req.start_date}</td>
                        <td>${req.end_date}</td>
                        <td>${req.reason || ''}</td>
                        <td>${req.status}</td>
                        <td class="actions-cell" data-request-id="${req.id}" data-status="${req.status}">
                            <!-- PTO actions will be injected here -->
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.querySelectorAll('.actions-cell').forEach(cell => {
        const requestId = cell.dataset.requestId;
        const status = cell.dataset.status;

        const attachmentButton = document.createElement('button');
        attachmentButton.textContent = 'Generate Attachment';
        attachmentButton.onclick = () => window.open(`pto_attachment.html?id=${requestId}`, '_blank');
        cell.appendChild(attachmentButton);

        if (currentUser && currentUser.role === 'admin' && status === 'pending') {
            const approveButton = document.createElement('button');
            approveButton.textContent = 'Approve';
            approveButton.className = 'approve-pto-btn';
            approveButton.onclick = async () => {
                await updatePtoRequestStatus(requestId, 'approved');
                renderPtoDashboard();
                renderCalendar();
            };
            cell.appendChild(approveButton);

            const denyButton = document.createElement('button');
            denyButton.textContent = 'Deny';
            denyButton.className = 'deny-pto-btn';
            denyButton.onclick = async () => {
                await updatePtoRequestStatus(requestId, 'denied');
                renderPtoDashboard();
            };
            cell.appendChild(denyButton);
        }
    });
}

async function renderShiftBidsDashboard() {
    if (currentUser && currentUser.role !== 'admin') {
        document.getElementById('shift-bids-container').innerHTML = '';
        return;
    }
    const { data: bids, error } = await getShiftBids();
    if (error) {
        showToast('Error fetching shift bids', true);
        return;
    }
    const container = document.getElementById('shift-bids-container');
    container.innerHTML = `
        <h2>Pending Shift Bids</h2>
        <table>
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Shift Date</th>
                    <th>Shift Time</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${bids.map(bid => `
                    <tr>
                        <td>${bid.employees ? bid.employees.name : 'N/A'}</td>
                        <td>${bid.shifts ? bid.shifts.shift_date : 'N/A'}</td>
                        <td>${bid.shifts ? `${bid.shifts.start_time} - ${bid.shifts.end_time}` : 'N/A'}</td>
                        <td>
                            <button class="approve-bid-btn" data-bid-id="${bid.id}" data-shift-id="${bid.shift_id}" data-employee-id="${bid.employee_id}">Approve</button>
                            <button class="deny-bid-btn" data-bid-id="${bid.id}">Deny</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.querySelectorAll('.approve-bid-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const bidId = e.target.dataset.bidId;
            const shiftId = e.target.dataset.shiftId;
            const employeeId = e.target.dataset.employeeId;

            await assignShiftToEmployee(shiftId, employeeId);
            await updateShiftBidStatus(bidId, 'approved');

            showToast('Shift bid approved!');
            renderShiftBidsDashboard();
            renderShiftList();
            renderCalendar();
        });
    });

    container.querySelectorAll('.deny-bid-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const bidId = e.target.dataset.bidId;
            await updateShiftBidStatus(bidId, 'denied');
            showToast('Shift bid denied.');
            renderShiftBidsDashboard();
        });
    });
}

async function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    const { data: shifts, error: shiftsError } = await getShifts();
    if (shiftsError) {
        showToast('Could not load shifts for calendar.', true);
        return;
    }
    const { data: ptoRequests, error: ptoError } = await getPtoRequests();
    if (ptoError) {
        showToast('Could not load PTO requests for calendar.', true);
        return;
    }

    const events = shifts.map(s => ({
        title: s.employees ? s.employees.name : 'Unassigned',
        start: `${s.shift_date}T${s.start_time}`,
        end: `${s.shift_date}T${s.end_time}`,
        backgroundColor: s.employee_id ? '#3788d8' : '#f56954',
        borderColor: s.employee_id ? '#3788d8' : '#f56954'
    }));

    const ptoEvents = ptoRequests
        .filter(r => r.status === 'approved' && r.employees)
        .map(r => ({
            title: `${r.employees.name} - PTO`,
            start: r.start_date,
            end: r.end_date,
            allDay: true,
            backgroundColor: '#00a65a',
            borderColor: '#00a65a'
    }));

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: [...events, ...ptoEvents]
    });
    calendar.render();
}
