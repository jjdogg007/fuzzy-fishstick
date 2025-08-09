from django.core.management.base import BaseCommand
from django.test import Client
from django.contrib.auth.models import User
from portal.models import Employee, AuditLog

class Command(BaseCommand):
    help = 'Verifies the employee management and audit log functionality.'

    def handle(self, *args, **options):
        client = Client()

        # --- Test Employee Addition and Listing ---
        self.stdout.write(self.style.SUCCESS('--- Testing Employee Management ---'))

        # 1. Add a new employee
        employee_name = 'John Doe'
        employee_email = 'john.doe@example.com'
        response = client.post('/employees/', {
            'name': employee_name,
            'email': employee_email,
        })

        if response.status_code != 200:
            self.stderr.write(f'Error: Failed to add employee. Status code: {response.status_code}')
            return

        self.stdout.write(self.style.SUCCESS('Successfully posted to /employees/ to add an employee.'))

        # 2. Verify the employee was created
        try:
            employee = Employee.objects.get(email=employee_email)
            if employee.user.get_full_name() == employee_name:
                self.stdout.write(self.style.SUCCESS(f'Employee "{employee_name}" created successfully in the database.'))
            else:
                self.stderr.write(f'Error: Employee name mismatch. Expected "{employee_name}", got "{employee.user.get_full_name()}"')
        except Employee.DoesNotExist:
            self.stderr.write('Error: Employee was not created in the database.')
            return

        # 3. Verify the employee appears on the page
        response = client.get('/employees/')
        if employee_name in response.content.decode():
            self.stdout.write(self.style.SUCCESS(f'Employee "{employee_name}" is displayed on the employee management page.'))
        else:
            self.stderr.write(f'Error: Employee "{employee_name}" is not displayed on the employee management page.')


        # --- Test Audit Log ---
        self.stdout.write(self.style.SUCCESS('\n--- Testing Audit Log ---'))

        # 1. Verify the audit log entry was created
        try:
            audit_log_entry = AuditLog.objects.get(action='Employee Added', details__contains=employee_name)
            self.stdout.write(self.style.SUCCESS('Audit log entry for adding the employee was created successfully.'))
        except AuditLog.DoesNotExist:
            self.stderr.write('Error: Audit log entry for adding the employee was not created.')
            return

        # 2. Verify the audit log entry appears on the audit log page
        response = client.get('/audit-log/')
        if 'Employee Added' in response.content.decode() and employee_name in response.content.decode():
            self.stdout.write(self.style.SUCCESS('Audit log entry is displayed on the audit log page.'))
        else:
            self.stderr.write('Error: Audit log entry is not displayed on the audit log page.')


        # --- Cleanup for Add Test ---
        employee.user.delete()
        audit_log_entry.delete()


        # --- Test Employee Editing ---
        self.stdout.write(self.style.SUCCESS('\n--- Testing Employee Editing ---'))
        # 1. Create a new employee to edit
        edit_employee_name = 'Jane Doe'
        edit_employee_email = 'jane.doe@example.com'
        user_to_edit = User.objects.create_user(username=edit_employee_email, password='password', first_name='Jane', last_name='Doe')
        employee_to_edit = Employee.objects.create(user=user_to_edit, email=edit_employee_email, employee_type='PT', role='EMP')

        # 2. Edit the employee
        new_name = 'Jane Smith'
        new_email = 'jane.smith@example.com'
        client.post(f'/employees/edit/{employee_to_edit.id}/', {
            'name': new_name,
            'email': new_email,
        })
        self.stdout.write(self.style.SUCCESS('Successfully posted to edit an employee.'))

        # 3. Verify the changes
        employee_to_edit.refresh_from_db()
        if employee_to_edit.user.get_full_name() == new_name and employee_to_edit.email == new_email:
            self.stdout.write(self.style.SUCCESS('Employee data was updated successfully in the database.'))
        else:
            self.stderr.write('Error: Employee data was not updated correctly.')

        # 4. Verify the audit log for editing
        try:
            edit_log = AuditLog.objects.get(action='Employee Edited', details__contains=new_name)
            self.stdout.write(self.style.SUCCESS('Audit log entry for editing was created successfully.'))
        except AuditLog.DoesNotExist:
            self.stderr.write('Error: Audit log entry for editing was not created.')

        # --- Cleanup for Edit Test ---
        employee_to_edit.user.delete()
        edit_log.delete()


        # --- Test Employee Deletion ---
        self.stdout.write(self.style.SUCCESS('\n--- Testing Employee Deletion ---'))
        # 1. Create a new employee to delete
        delete_employee_name = 'Temp Employee'
        delete_employee_email = 'temp@example.com'
        user_to_delete = User.objects.create_user(username=delete_employee_email, password='password', first_name='Temp', last_name='Employee')
        employee_to_delete = Employee.objects.create(user=user_to_delete, email=delete_employee_email, employee_type='FT', role='EMP')

        # 2. Delete the employee
        client.post(f'/employees/delete/{employee_to_delete.id}/')
        self.stdout.write(self.style.SUCCESS('Successfully posted to delete an employee.'))

        # 3. Verify deletion
        if not Employee.objects.filter(id=employee_to_delete.id).exists():
            self.stdout.write(self.style.SUCCESS('Employee was successfully deleted from the database.'))
        else:
            self.stderr.write('Error: Employee was not deleted from the database.')

        # 4. Verify the audit log for deletion
        try:
            delete_log = AuditLog.objects.get(action='Employee Deleted', details__contains=delete_employee_name)
            self.stdout.write(self.style.SUCCESS('Audit log entry for deletion was created successfully.'))
        except AuditLog.DoesNotExist:
            self.stderr.write('Error: Audit log entry for deletion was not created.')

        # --- Cleanup for Delete Test ---
        if delete_log:
            delete_log.delete()

        self.stdout.write(self.style.SUCCESS('\n--- All tests completed ---'))
