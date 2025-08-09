import { getEmployees } from './api.js';

const app = document.getElementById('app');

export function initUI() {
    app.innerHTML = `
        <h2>Employees</h2>
        <div id="employee-list-container"></div>
    `;

    renderEmployeeList();
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
