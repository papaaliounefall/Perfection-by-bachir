from django.contrib import admin

from .models import Employee


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ["full_name", "job_title", "status", "is_active"]
    list_filter = ["status", "is_active"]
    search_fields = ["full_name", "email", "phone"]
    raw_id_fields = ["user"]
