from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["recipient", "title", "created_at", "read_at"]
    list_filter = ["kind"]
    search_fields = ["recipient__email", "title"]
    raw_id_fields = ["recipient", "appointment"]
