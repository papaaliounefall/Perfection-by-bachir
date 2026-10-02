from django.contrib import admin

from .models import ContactRequest, Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ["full_name", "phone", "email", "segment", "created_at"]
    list_filter = ["segment"]
    search_fields = ["full_name", "phone", "email"]
    raw_id_fields = ["user"]


@admin.register(ContactRequest)
class ContactRequestAdmin(admin.ModelAdmin):
    list_display = ["full_name", "phone", "email", "created_at", "handled"]
    list_filter = ["handled"]
    list_editable = ["handled"]
    search_fields = ["full_name", "phone", "email"]
