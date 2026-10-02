from django.contrib import admin

from .models import Service


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "pricing_type", "price", "duration_minutes", "is_active"]
    list_filter = ["category", "is_active"]
    list_editable = ["is_active"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ["name"]}
