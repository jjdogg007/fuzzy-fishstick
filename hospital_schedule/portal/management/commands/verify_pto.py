from django.core.management.base import BaseCommand
from django.test import Client
from django.contrib.auth.models import User
from portal.models import Employee, PTORequest

class Command(BaseCommand):
    help = 'Verifies the PTO request submission functionality.'

    def handle(self, *args, **options):
        # Create a test user
        test_username = 'testuser'
        test_password = 'password'
        try:
            user = User.objects.get(username=test_username)
            self.stdout.write(self.style.SUCCESS('Test user already exists.'))
        except User.DoesNotExist:
            user = User.objects.create_user(username=test_username, password=test_password)
            self.stdout.write(self.style.SUCCESS('Test user created.'))

        # Create a test employee
        try:
            employee = Employee.objects.get(user=user)
            self.stdout.write(self.style.SUCCESS('Test employee already exists.'))
        except Employee.DoesNotExist:
            employee = Employee.objects.create(user=user, employee_type='FT', role='EMP')
            self.stdout.write(self.style.SUCCESS('Test employee created.'))

        # Use the test client to make a POST request
        client = Client()
        response = client.post('/', {
            'employee_id': user.id,
            'start_date': '2025-09-01',
            'end_date': '2025-09-05',
            'reason': 'Vacation',
        })

        # Check the response
        if response.status_code == 200:
            self.stdout.write(self.style.SUCCESS('Request successful.'))
            if 'PTO Request Submitted Successfully' in response.content.decode():
                self.stdout.write(self.style.SUCCESS('Success page rendered correctly.'))
            else:
                self.stderr.write('Error: Success page not rendered. Response content:')
                self.stderr.write(response.content.decode())
        else:
            self.stderr.write(f'Error: Request failed with status code {response.status_code}')
            self.stderr.write('Response content:')
            self.stderr.write(response.content.decode())

        # Check if the PTORequest was created
        pto_requests_count = PTORequest.objects.filter(employee=employee).count()
        if pto_requests_count > 0:
            self.stdout.write(self.style.SUCCESS(f'Successfully created {pto_requests_count} PTO request(s) for the test employee.'))
            # Clean up the created PTO requests
            PTORequest.objects.filter(employee=employee).delete()
            self.stdout.write(self.style.SUCCESS('Cleaned up created PTO requests.'))
        else:
            self.stderr.write('Error: No PTO request was created.')

        # Clean up the test user and employee
        user.delete()
        self.stdout.write(self.style.SUCCESS('Cleaned up test user and employee.'))
