from django.shortcuts import render, redirect
from django.http import HttpResponse
from .models import PTORequest, Employee, AuditLog
from django.contrib.auth.models import User
from django.views.decorators.http import require_POST

def index(request):
    if request.method == 'POST':
        try:
            employee_id = request.POST.get('employee_id')
            user = User.objects.get(id=employee_id)
            employee = Employee.objects.get(user=user)

            PTORequest.objects.create(
                employee=employee,
                start_date=request.POST.get('start_date'),
                end_date=request.POST.get('end_date'),
                reason=request.POST.get('reason'),
            )
            return render(request, 'portal/success.html')
        except (User.DoesNotExist, Employee.DoesNotExist):
            return render(request, 'portal/index.html', {'error': 'Invalid Employee ID'})
        except Exception as e:
            return render(request, 'portal/index.html', {'error': f"An error occurred: {e}"})


    return render(request, 'portal/index.html')


def employee_management(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        email = request.POST.get('email')

        # Basic validation
        if not name:
            return render(request, 'portal/employee_management.html', {
                'error': 'Name is required.',
                'employees': Employee.objects.all()
            })

        # Check for duplicates
        username = email if email else name.replace(' ', '').lower()
        if User.objects.filter(username=username).exists():
            return render(request, 'portal/employee_management.html', {
                'error': f'An employee with username "{username}" already exists.',
                'employees': Employee.objects.all()
            })
        if email and User.objects.filter(email=email).exists():
            return render(request, 'portal/employee_management.html', {
                'error': f'An employee with email "{email}" already exists.',
                'employees': Employee.objects.all()
            })

        # Create a new user
        try:
            user = User.objects.create_user(
                username=username,
                password='temppassword',  # In a real app, use a more secure way to handle passwords
                first_name=name.split(' ')[0],
                last_name=' '.join(name.split(' ')[1:]),
                email=email
            )
        except Exception as e:
            return render(request, 'portal/employee_management.html', {
                'error': f'Error creating user: {e}',
                'employees': Employee.objects.all()
            })

        # Create a new employee
        employee = Employee.objects.create(
            user=user,
            employee_type='FT',  # Using a default value
            role='EMP'  # Using a default value
        )

        # Create an audit log entry
        AuditLog.objects.create(
            action='Employee Added',
            details=f'Employee {employee.user.get_full_name()} was added.'
        )

        return render(request, 'portal/employee_management.html', {
            'employees': Employee.objects.all()
        })

    employees = Employee.objects.all()
    return render(request, 'portal/employee_management.html', {'employees': employees})


def audit_log(request):
    logs = AuditLog.objects.all().order_by('-timestamp')
    return render(request, 'portal/audit_log.html', {'logs': logs})


def edit_employee(request, employee_id):
    try:
        employee = Employee.objects.get(id=employee_id)
    except Employee.DoesNotExist:
        return redirect('employee_management')

    if request.method == 'POST':
        name = request.POST.get('name')
        email = request.POST.get('email')

        if not name:
            return render(request, 'portal/edit_employee.html', {
                'error': 'Name is required.',
                'employee': employee
            })

        # Check for duplicate email
        if email and User.objects.filter(email=email).exclude(id=employee.user.id).exists():
            return render(request, 'portal/edit_employee.html', {
                'error': f'An employee with email "{email}" already exists.',
                'employee': employee
            })

        # Update user and employee
        employee.user.first_name = name.split(' ')[0]
        employee.user.last_name = ' '.join(name.split(' ')[1:])
        employee.user.email = email
        employee.user.save()

        employee.save()

        # Create an audit log entry
        AuditLog.objects.create(
            action='Employee Edited',
            details=f'Employee {employee.user.get_full_name()} was edited.'
        )

        return redirect('employee_management')

    return render(request, 'portal/edit_employee.html', {'employee': employee})


@require_POST
def delete_employee(request, employee_id):
    try:
        employee = Employee.objects.get(id=employee_id)
        employee_name = employee.user.get_full_name()
        employee.user.delete()

        # Create an audit log entry
        AuditLog.objects.create(
            action='Employee Deleted',
            details=f'Employee {employee_name} was deleted.'
        )
    except Employee.DoesNotExist:
        pass  # Or handle the error appropriately
    return redirect('employee_management')
