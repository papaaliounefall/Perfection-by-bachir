from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Lecture seule : un journal d'audit ne se modifie pas."""

    list_display = ["created_at", "actor", "action", "object_type", "object_repr"]
    list_filter = ["action", "object_type"]
    search_fields = ["object_repr", "actor__email"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
