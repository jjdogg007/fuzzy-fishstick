from django.shortcuts import render
from django.http import HttpResponse
from .models import PTORequest, Employee
from django.contrib.auth.models import User

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
