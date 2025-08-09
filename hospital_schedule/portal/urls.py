from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('employees/', views.employee_management, name='employee_management'),
    path('employees/edit/<int:employee_id>/', views.edit_employee, name='edit_employee'),
    path('employees/delete/<int:employee_id>/', views.delete_employee, name='delete_employee'),
    path('audit-log/', views.audit_log, name='audit_log'),
]
