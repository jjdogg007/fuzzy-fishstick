import { getEmployees, getShifts, addShift, updateShift, deleteShift, getShift } from './api.js';

const app = document.getElementById('app');

export function initUI() {
    app.innerHTML = `
        <h2>Employees</h2>
        <div id="employee-list-container"></div>
        <hr>
        <h2>Shifts</h2>
        <div id="add-shift-form-container"></div>
        <div id="shift-list-container"></div>
    `;

    renderEmployeeList();
    renderAddShiftForm();
    renderShiftList();

    // --- Online/Offline Status ---
    const statusIndicator = document.getElementById('status-indicator');
    const toastContainer = document.getElementById('toast-container');

    function showToast(message) {
        toastContainer.textContent = message;
        toastContainer.className = 'show';
        setTimeout(function(){ toastContainer.className = toastContainer.className.replace('show', ''); }, 3000);
    }

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
        console.log('Sync complete, re-rendering shift list.');
        renderShiftList();
    });
    // We need to call it once to set the initial status, but we don't want to show a toast on page load.
    // So, we'll just set the status bar.
    if (navigator.onLine) {
        statusIndicator.textContent = '🟢 Connected';
        statusIndicator.style.backgroundColor = '#4CAF50';
    } else {
        statusIndicator.textContent = '🔴 Offline';
        statusIndicator.style.backgroundColor = '#f44336';
    }


    const shiftListContainer = document.getElementById('shift-list-container');
    const modal = document.getElementById('edit-shift-modal');
    const modalForm = document.getElementById('edit-shift-form');
    const closeModalBtn = document.querySelector('.close-btn');

    closeModalBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    shiftListContainer.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('delete-shift-btn')) {
            const shiftId = target.dataset.id;
            const confirmed = confirm('Are you sure you want to delete this shift?');
            if (confirmed) {
                await deleteShift(shiftId);
                renderShiftList();
            }
        }

        if (target.classList.contains('edit-shift-btn')) {
            const shiftId = target.dataset.id;
            const shift = await getShift(shiftId);
            if (shift) {
                document.getElementById('edit-shift-id').value = shift.id;
                document.getElementById('edit-shift-date').value = shift.shift_date;
                document.getElementById('edit-start-time').value = shift.start_time;
                document.getElementById('edit-end-time').value = shift.end_time;
                modal.style.display = 'block';
            }
        }
    });

    modalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const shiftId = document.getElementById('edit-shift-id').value;
        const shiftData = {
            shift_date: document.getElementById('edit-shift-date').value,
            start_time: document.getElementById('edit-start-time').value,
            end_time: document.getElementById('edit-end-time').value,
        };
        await updateShift(shiftId, shiftData);
        modal.style.display = 'none';
        renderShiftList();
    });
}

async function renderEmployeeList() {
    const container = document.getElementById('employee-list-container');
    const employees = await getEmployees();

    if (employees.length === 0) {
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
            </tr>
        </thead>
        <tbody>
            ${employees.map(employee => `
                <tr>
                    <td>${employee.name}</td>
                    <td>${employee.email || 'N/A'}</td>
                    <td>${employee.type || 'N/A'}</td>
                    <td>${employee.hire_date || 'N/A'}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.innerHTML = '';
    container.appendChild(table);
}

async function renderAddShiftForm() {
    const container = document.getElementById('add-shift-form-container');
    const employees = await getEmployees();

    const form = document.createElement('form');
    form.id = 'add-shift-form';
    form.innerHTML = `
        <h3>Add New Shift</h3>
        <label for="employee-select">Employee:</label>
        <select id="employee-select" name="employee_id" required>
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

        await addShift(shiftData);

        form.reset();
        renderShiftList();
    });

    container.innerHTML = '';
    container.appendChild(form);
}

async function renderShiftList() {
    const container = document.getElementById('shift-list-container');
    const shifts = await getShifts();

    if (shifts.length === 0) {
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
