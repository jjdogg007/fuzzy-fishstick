import { getEmployees, getShifts, addShift, updateShift, deleteShift } from './api.js';

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

    const shiftListContainer = document.getElementById('shift-list-container');
    shiftListContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-shift-btn')) {
            const shiftId = e.target.dataset.id;
            const confirmed = confirm('Are you sure you want to delete this shift?');
            if (confirmed) {
                await deleteShift(shiftId);
                renderShiftList();
            }
        }

        if (e.target.classList.contains('edit-shift-btn')) {
            const shiftId = e.target.dataset.id;
            const newDate = prompt('Enter new date (YYYY-MM-DD):');
            const newStartTime = prompt('Enter new start time (HH:MM):');
            const newEndTime = prompt('Enter new end time (HH:MM):');

            if (newDate && newStartTime && newEndTime) {
                await updateShift(shiftId, {
                    shift_date: newDate,
                    start_time: newStartTime,
                    end_time: newEndTime,
                });
                renderShiftList();
            }
        }
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
