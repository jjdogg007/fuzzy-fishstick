from django.shortcuts import render
from django.http import HttpResponse
from .models import PTORequest, Employee
from django.contrib.auth.models import User

def index(request):
    if request.method == 'POST':
        # This will be handled in a later step
        return HttpResponse("Form submitted!")

    # For now, we'll just render a simple template.
    # We'll create the template in the next step.
    return render(request, 'portal/index.html')
