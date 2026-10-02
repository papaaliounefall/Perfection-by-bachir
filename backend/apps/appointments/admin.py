from django.contrib import admin

from .models import Appointment, AppointmentStatusHistory, Closure, OpeningHours


class HistoryInline(admin.TabularInline):
    model = AppointmentStatusHistory
    extra = 0
    can_delete = False
    readonly_fields = ["action", "from_status", "to_status", "note", "changed_by", "created_at"]

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ["reference", "start_at", "customer", "vehicle", "service", "status"]
    list_filter = ["status", "service"]
    search_fields = ["reference", "customer__full_name", "vehicle__registration"]
    date_hierarchy = "start_at"
    raw_id_fields = ["customer", "vehicle"]
    # Le statut ne se modifie que via les actions métier de l'API
    readonly_fields = ["reference", "status", "created_by"]
    inlines = [HistoryInline]


@admin.register(OpeningHours)
class OpeningHoursAdmin(admin.ModelAdmin):
    list_display = ["weekday", "is_closed", "opens_at", "closes_at"]


@admin.register(Closure)
class ClosureAdmin(admin.ModelAdmin):
    list_display = ["start_date", "end_date", "reason"]
