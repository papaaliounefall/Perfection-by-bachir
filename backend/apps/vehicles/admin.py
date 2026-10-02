from django.contrib import admin

from .models import Vehicle


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ["registration", "brand", "model", "customer", "year"]
    search_fields = ["registration", "brand", "model", "customer__full_name"]
    raw_id_fields = ["customer"]
