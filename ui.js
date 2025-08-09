import {
    getEmployees, getShifts, addShift, updateShift, deleteShift, getShift,
    addEmployee, updateEmployee, deleteEmployee, getEmployee, getPtoRequests,
    updatePtoRequestStatus, addPtoRequest, getPtoRequestById, addShiftBid,
    getShiftBids, updateShiftBidStatus, assignShiftToEmployee
} from './api.js';

const app = document.getElementById('app');
let toastTimer;

function showToast(message, isError = false) {
    const toastContainer = document.getElementById('toast-container');
    toastContainer.textContent = message;
    toastContainer.style.backgroundColor = isError ? '#f44336' : '#333';
    toastContainer.className = 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastContainer.className = toastContainer.className.replace('show', ''); }, 3000);
}

export function initUI() {
    app.innerHTML = `
        <h2>Employees</h2>
        <div id="add-employee-form-container"></div>
        <div id="employee-list-container"></div>
        <hr>
        <h2>Shifts</h2>
        <div id="add-shift-form-container"></div>
        <div id="shift-list-container"></div>
        <hr>
        <h2>PTO Requests</h2>
        <div id="add-pto-request-form-container"></div>
        <div id="pto-dashboard-container"></div>
        <hr>
        <h2>Shift Bids</h2>
        <div id="shift-bids-container"></div>
    `;

    renderAddEmployeeForm();
    renderEmployeeList();
    renderAddShiftForm();
    renderShiftList();
    renderPtoDashboard();
    renderPtoRequestForm();
    renderCalendar();
    renderShiftBidsDashboard();

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
        renderEmployeeList();
    });

    if (navigator.onLine) {
        statusIndicator.textContent = '🟢 Connected';
        statusIndicator.style.backgroundColor = '#4CAF50';
    } else {
        statusIndicator.textContent = '🔴 Offline';
        statusIndicator.style.backgroundColor = '#f44336';
    }


    // --- Event Listeners ---
    const shiftListContainer = document.getElementById('shift-list-container');
    const shiftModal = document.getElementById('edit-shift-modal');
    const shiftModalForm = document.getElementById('edit-shift-form');
    const closeShiftModalBtn = document.querySelector('.close-btn');

    closeShiftModalBtn.onclick = () => shiftModal.style.display = 'none';

    shiftListContainer.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('delete-shift-btn')) {
            const shiftId = target.dataset.id;
            if (confirm('Are you sure you want to delete this shift?')) {
                const { error } = await deleteShift(shiftId);
                if (error) return showToast(error.message, true);
                renderShiftList();
            }
        }

        if (target.classList.contains('edit-shift-btn')) {
            const shiftId = target.dataset.id;
            const { data: shift, error } = await getShift(shiftId);
            if (error) return showToast(error.message, true);
            if (shift) {
                document.getElementById('edit-shift-id').value = shift.id;
                document.getElementById('edit-shift-date').value = shift.shift_date;
                document.getElementById('edit-start-time').value = shift.start_time;
                document.getElementById('edit-end-time').value = shift.end_time;
                shiftModal.style.display = 'block';
            }
        }
    });

    shiftModalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const shiftId = document.getElementById('edit-shift-id').value;
        const shiftData = {
            shift_date: document.getElementById('edit-shift-date').value,
            start_time: document.getElementById('edit-start-time').value,
            end_time: document.getElementById('edit-end-time').value,
        };
        const { error } = await updateShift(shiftId, shiftData);
        if (error) return showToast(error.message, true);
        shiftModal.style.display = 'none';
        renderShiftList();
    });

    const employeeListContainer = document.getElementById('employee-list-container');
    const employeeModal = document.getElementById('edit-employee-modal');
    const employeeModalForm = document.getElementById('edit-employee-form');
    const closeEmployeeModalBtn = document.querySelector('.close-btn-employee');

    closeEmployeeModalBtn.onclick = () => employeeModal.style.display = 'none';

    employeeListContainer.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('delete-employee-btn')) {
            const employeeId = target.dataset.id;
            if (confirm('Are you sure you want to delete this employee?')) {
                const { error } = await deleteEmployee(employeeId);
                if (error) return showToast(error.message, true);
                renderEmployeeList();
            }
        }

        if (target.classList.contains('edit-employee-btn')) {
            const employeeId = target.dataset.id;
            const { data: employee, error } = await getEmployee(employeeId);
            if (error) return showToast(error.message, true);
            if (employee) {
                document.getElementById('edit-employee-id').value = employee.id;
                document.getElementById('edit-employee-name').value = employee.name;
                document.getElementById('edit-employee-email').value = employee.email;
                employeeModal.style.display = 'block';
            }
        }
    });

    employeeModalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const employeeId = document.getElementById('edit-employee-id').value;
        const employeeData = {
            name: document.getElementById('edit-employee-name').value,
            email: document.getElementById('edit-employee-email').value,
        };
        const { error } = await updateEmployee(employeeId, employeeData);
        if (error) return showToast(error.message, true);
        employeeModal.style.display = 'none';
        renderEmployeeList();
    });

    const ptoDashboardContainer = document.getElementById('pto-dashboard-container');
    ptoDashboardContainer.addEventListener('click', async (e) => {
        const target = e.target;
        const requestId = target.dataset.id;

        if (target.classList.contains('approve-pto-btn')) {
            const { error } = await updatePtoRequestStatus(requestId, 'approved');
            if (error) return showToast(error.message, true);
            renderPtoDashboard();
        }

        if (target.classList.contains('deny-pto-btn')) {
            const { error } = await updatePtoRequestStatus(requestId, 'denied');
            if (error) return showToast(error.message, true);
            renderPtoDashboard();
        }

        if (target.classList.contains('generate-attachment-btn')) {
            const { data: request, error } = await getPtoRequestById(requestId); // This function needs to be created
            if (error) return showToast(error.message, true);

            const params = new URLSearchParams({
                employeeName: request.employees.name,
                startDate: request.start_date,
                endDate: request.end_date,
                reason: request.reason,
                status: request.status,
                requestDate: new Date(request.created_at).toLocaleDateString()
            });
            window.open(`pto_attachment.html?${params.toString()}`, '_blank');
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target == shiftModal) shiftModal.style.display = 'none';
        if (event.target == employeeModal) employeeModal.style.display = 'none';
    });

    document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            document.getElementById('employee-name').focus();
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            if (employeeModal.style.display === 'block') {
                employeeModalForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            } else if (shiftModal.style.display === 'block') {
                shiftModalForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            } else {
                // Determine which add form is more relevant to submit
                // For now, let's default to employee form if it exists
                const addEmployeeForm = document.getElementById('add-employee-form');
                if (addEmployeeForm) {
                    addEmployeeForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
            }
        }
    });
}

async function renderEmployeeList() {
    const container = document.getElementById('employee-list-container');
    const { data: employees, error } = await getEmployees();
    if (error) return showToast(error.message, true);

    if (!employees || employees.length === 0) {
        container.innerHTML = '<p>No employees found.</p>';
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Type</th>
                <th>Hire Date</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${employees.map(employee => `
                <tr>
                    <td>${employee.name}</td>
                    <td>${employee.email || 'N/A'}</td>
                    <td>${employee.type || 'N/A'}</td>
                    <td>${employee.hire_date || 'N/A'}</td>
                    <td>
                        <button class="edit-employee-btn" data-id="${employee.id}">Edit</button>
                        <button class="delete-employee-btn" data-id="${employee.id}">Delete</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.innerHTML = '';
    container.appendChild(table);
}

async function renderShiftBidsDashboard() {
    const container = document.getElementById('shift-bids-container');
    const { data: bids, error } = await getShiftBids();
    if (error) return showToast(error.message, true);

    if (!bids || bids.length === 0) {
        container.innerHTML = '<p>No pending shift bids.</p>';
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Shift Date</th>
                <th>Shift Time</th>
                <th>Employee Bidding</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${bids.map(bid => `
                <tr>
                    <td>${bid.shifts.shift_date}</td>
                    <td>${bid.shifts.start_time} - ${bid.shifts.end_time}</td>
                    <td>${bid.employees.name}</td>
                    <td>
                        <button class="approve-bid-btn" data-bid-id="${bid.id}" data-shift-id="${bid.shift_id}" data-employee-id="${bid.employee_id}">Approve</button>
                        <button class="deny-bid-btn" data-bid-id="${bid.id}">Deny</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.innerHTML = '';
    container.appendChild(table);

    container.addEventListener('click', async (e) => {
        const target = e.target;
        const bidId = target.dataset.bidId;

        if (target.classList.contains('approve-bid-btn')) {
            const shiftId = target.dataset.shiftId;
            const employeeId = target.dataset.employeeId;

            await assignShiftToEmployee(shiftId, employeeId);
            await updateShiftBidStatus(bidId, 'approved');

            // This is a simplification. A real app would also deny other bids for the same shift.
            showToast('Shift bid approved!');
            renderShiftBidsDashboard();
            renderCalendar(); // Re-render calendar to show the assigned shift
        }

        if (target.classList.contains('deny-bid-btn')) {
            await updateShiftBidStatus(bidId, 'denied');
            showToast('Shift bid denied.');
            renderShiftBidsDashboard();
        }
    });
}

async function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    const { data: shifts, error } = await getShifts();
    if (error) return showToast(error.message, true);

    const events = shifts.map(shift => {
        const isAssigned = shift.employees && shift.employees.name;
        return {
            title: isAssigned ? shift.employees.name : 'Open Shift',
            start: `${shift.shift_date}T${shift.start_time}`,
            end: `${shift.shift_date}T${shift.end_time}`,
            id: shift.id,
            allDay: false,
            backgroundColor: isAssigned ? '#3498db' : '#95a5a6',
            borderColor: isAssigned ? '#2980b9' : '#7f8c8d',
            extendedProps: {
                isAssigned: isAssigned
            }
        };
    });

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: events,
        eventClick: async function(info) {
            if (!info.event.extendedProps.isAssigned) {
                const employeeId = prompt('Enter your employee ID to bid on this shift:');
                if (employeeId) {
                    const bidData = {
                        shift_id: info.event.id,
                        employee_id: employeeId
                    };
                    const { error } = await addShiftBid(bidData);
                    if (error) {
                        showToast(error.message, true);
                    } else {
                        showToast('Bid submitted successfully!');
                    }
                }
            }
        }
    });

    calendar.render();
}

async function renderPtoRequestForm() {
    const container = document.getElementById('add-pto-request-form-container');
    const { data: employees, error } = await getEmployees();
    if (error) return showToast(error.message, true);

    const form = document.createElement('form');
    form.id = 'add-pto-request-form';
    form.innerHTML = `
        <h3>Submit PTO Request</h3>
        <label for="pto-employee-select">Employee:</label>
        <select id="pto-employee-select" name="employee_id" required>
            ${employees.map(emp => `<option value="${emp.id}">${emp.name}</option>`).join('')}
        </select>
        <label for="pto-start-date">Start Date:</label>
        <input type="date" id="pto-start-date" name="start_date" required>
        <label for="pto-end-date">End Date:</label>
        <input type="date" id="pto-end-date" name="end_date" required>
        <label for="pto-reason">Reason:</label>
        <textarea id="pto-reason" name="reason"></textarea>
        <button type="submit">Submit Request</button>
    `;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const requestData = Object.fromEntries(formData.entries());
        const { error } = await addPtoRequest(requestData);
        if (error) return showToast(error.message, true);
        form.reset();
        renderPtoDashboard();
    });

    container.innerHTML = '';
    container.appendChild(form);
}

async function renderPtoDashboard() {
    const container = document.getElementById('pto-dashboard-container');
    const { data: ptoRequests, error } = await getPtoRequests();
    if (error) return showToast(error.message, true);

    if (!ptoRequests || ptoRequests.length === 0) {
        container.innerHTML = '<p>No PTO requests found.</p>';
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Employee</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${ptoRequests.map(request => `
                <tr>
                    <td>${request.employees.name || 'N/A'}</td>
                    <td>${request.start_date}</td>
                    <td>${request.end_date}</td>
                    <td>${request.reason || 'N/A'}</td>
                    <td>${request.status}</td>
                    <td>
                        ${request.status === 'pending' ? `
                            <button class="approve-pto-btn" data-id="${request.id}">Approve</button>
                            <button class="deny-pto-btn" data-id="${request.id}">Deny</button>
                        ` : ''}
                        <button class="generate-attachment-btn" data-id="${request.id}">Generate Attachment</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.innerHTML = '';
    container.appendChild(table);
}

async function renderAddEmployeeForm() {
    const container = document.getElementById('add-employee-form-container');
    const form = document.createElement('form');
    form.id = 'add-employee-form';
    form.innerHTML = `
        <h3>Add New Employee</h3>
        <label for="employee-name">Name:</label>
        <input type="text" id="employee-name" name="name" required>
        <label for="employee-email">Email:</label>
        <input type="email" id="employee-email" name="email">
        <button type="submit">Add Employee</button>
    `;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const employeeData = Object.fromEntries(formData.entries());
        const { error } = await addEmployee(employeeData);
        if (error) return showToast(error.message, true);
        form.reset();
        renderEmployeeList();
    });

    container.innerHTML = '';
    container.appendChild(form);
}

async function renderAddShiftForm() {
    const container = document.getElementById('add-shift-form-container');
    const { data: employees, error } = await getEmployees();
    if (error) return showToast(error.message, true);

    const form = document.createElement('form');
    form.id = 'add-shift-form';
    form.innerHTML = `
        <h3>Add New Shift</h3>
        <label for="employee-select">Employee (optional):</label>
        <select id="employee-select" name="employee_id">
            <option value="">-- Open Shift --</option>
            ${employees.map(emp => `<option value="${emp.id}">${emp.name}</option>`).join('')}
        </select>
        <label for="shift-date">Date:</label>
        <input type="date" id="shift-date" name="shift_date" required>
        <label for="start-time">Start Time:</label>
        <input type="time" id="start-time" name="start_time" required>
        <label for="end-time">End Time:</label>
        <input type="time" id="end-time" name="end_time" required>
        <button type="submit">Add Shift</button>
    `;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const shiftData = Object.fromEntries(formData.entries());
        const { error } = await addShift(shiftData);
        if (error) return showToast(error.message, true);
        form.reset();
        renderShiftList();
    });

    container.innerHTML = '';
    container.appendChild(form);
}

async function renderShiftList() {
    const container = document.getElementById('shift-list-container');
    const { data: shifts, error } = await getShifts();
    if (error) return showToast(error.message, true);

    if (!shifts || shifts.length === 0) {
        container.innerHTML = '<p>No shifts found.</p>';
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${shifts.map(shift => `
                <tr>
                    <td>${shift.employees.name || 'Unassigned'}</td>
                    <td>${shift.shift_date}</td>
                    <td>${shift.start_time}</td>
                    <td>${shift.end_time}</td>
                    <td>
                        <button class="edit-shift-btn" data-id="${shift.id}">Edit</button>
                        <button class="delete-shift-btn" data-id="${shift.id}">Delete</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.innerHTML = '';
    container.appendChild(table);
}
