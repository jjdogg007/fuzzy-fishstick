import os
import sys
import django
from django.test import Client
from django.contrib.auth.models import User


def run_verification():
    # Add the project directory to the Python path
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hospital_schedule.settings')
    django.setup()

    from portal.models import Employee, PTORequest

    # Create a test user
    test_username = 'testuser'
    test_password = 'password'
    try:
        user = User.objects.get(username=test_username)
        print("Test user already exists.")
    except User.DoesNotExist:
        user = User.objects.create_user(username=test_username, password=test_password)
        print("Test user created.")

    # Create a test employee
    try:
        employee = Employee.objects.get(user=user)
        print("Test employee already exists.")
    except Employee.DoesNotExist:
        employee = Employee.objects.create(user=user, employee_type='FT', role='EMP')
        print("Test employee created.")

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
        print("Request successful.")
        # Check if the success template was rendered
        if 'PTO Request Submitted Successfully' in response.content.decode():
            print("Success page rendered correctly.")
        else:
            print("Error: Success page not rendered. Response content:")
            print(response.content.decode())
    else:
        print(f"Error: Request failed with status code {response.status_code}")
        print("Response content:")
        print(response.content.decode())


    # Check if the PTORequest was created
    pto_requests_count = PTORequest.objects.filter(employee=employee).count()
    if pto_requests_count > 0:
        print(f"Successfully created {pto_requests_count} PTO request(s) for the test employee.")
        # Clean up the created PTO requests
        PTORequest.objects.filter(employee=employee).delete()
        print("Cleaned up created PTO requests.")
    else:
        print("Error: No PTO request was created.")

    # Clean up the test user and employee
    user.delete()
    print("Cleaned up test user and employee.")

if __name__ == "__main__":
    run_verification()
