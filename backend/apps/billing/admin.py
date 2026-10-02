from django.contrib import admin

from .models import Invoice, InvoiceLine, Payment


class LineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 0


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    can_delete = False
    readonly_fields = ["amount", "method", "reference", "received_at", "recorded_by", "refunded_at", "refund_reason"]

    def has_add_permission(self, request, obj=None):
        return False  # les encaissements passent par l'API (audit + notification)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["number", "customer", "issued_at", "cancelled_at"]
    search_fields = ["number", "customer__full_name"]
    raw_id_fields = ["customer", "appointment"]
    readonly_fields = ["number", "created_by"]
    inlines = [LineInline, PaymentInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["invoice", "amount", "method", "received_at", "refunded_at"]
    list_filter = ["method"]
    search_fields = ["invoice__number", "reference"]

    def has_change_permission(self, request, obj=None):
        return False
