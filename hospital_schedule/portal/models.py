from django.db import models
from django.contrib.auth.models import User

class Employee(models.Model):
    EMPLOYEE_TYPE_CHOICES = [
        ('FT', 'Full-time'),
        ('PT', 'Part-time'),
    ]

    ROLE_CHOICES = [
        ('EMP', 'Employee'),
        ('MGR', 'Manager'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    employee_type = models.CharField(max_length=2, choices=EMPLOYEE_TYPE_CHOICES)
    role = models.CharField(max_length=3, choices=ROLE_CHOICES, default='EMP')

    email = models.EmailField(max_length=254, blank=True)

    def __str__(self):
        return self.user.get_full_name() or self.user.username

class AuditLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=100)
    details = models.TextField()

    def __str__(self):
        return f'{self.timestamp.strftime("%Y-%m-%d %H:%M:%S")} - {self.action}'

class Shift(models.Model):
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='shifts')

    def __str__(self):
        return f"{self.start_time.strftime('%Y-%m-%d %H:%M')} - {self.end_time.strftime('%H:%M')}"

class PTORequest(models.Model):
    STATUS_CHOICES = [
        ('PEND', 'Pending'),
        ('APPR', 'Approved'),
        ('DENY', 'Denied'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='pto_requests')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=4, choices=STATUS_CHOICES, default='PEND')

    def __str__(self):
        return f"{self.employee} - {self.start_date} to {self.end_date} ({self.get_status_display()})"
