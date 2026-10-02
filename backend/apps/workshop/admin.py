from django.contrib import admin

from .models import AppointmentPhoto, WorkshopStep


@admin.register(WorkshopStep)
class WorkshopStepAdmin(admin.ModelAdmin):
    list_display = ["appointment", "order", "title", "done_at", "done_by"]
    raw_id_fields = ["appointment"]


@admin.register(AppointmentPhoto)
class AppointmentPhotoAdmin(admin.ModelAdmin):
    list_display = ["appointment", "kind", "caption", "created_at"]
    list_filter = ["kind"]
    raw_id_fields = ["appointment"]
