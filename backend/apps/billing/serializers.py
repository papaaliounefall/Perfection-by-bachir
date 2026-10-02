from rest_framework import serializers

from apps.appointments.models import Appointment

from .models import Invoice, InvoiceLine, Payment


class InvoiceLineSerializer(serializers.ModelSerializer):
    total = serializers.IntegerField(read_only=True)

    class Meta:
        model = InvoiceLine
        fields = ["label", "quantity", "unit_price", "total"]


class PaymentSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source="get_method_display", read_only=True)
    invoice_number = serializers.CharField(source="invoice.number", read_only=True)
    refunded = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id", "invoice", "invoice_number", "amount", "method", "method_display", "reference",
            "received_at", "refunded", "refunded_at", "refund_reason",
        ]
        read_only_fields = fields

    def get_refunded(self, obj):
        return obj.refunded_at is not None


class InvoiceSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    appointment_reference = serializers.CharField(source="appointment.reference", read_only=True, default=None)
    vehicle = serializers.SerializerMethodField()
    lines = InvoiceLineSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    subtotal = serializers.IntegerField(read_only=True)
    total = serializers.IntegerField(read_only=True)
    paid_amount = serializers.IntegerField(read_only=True)
    balance = serializers.IntegerField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "number", "status", "status_display", "customer", "customer_name", "appointment",
            "appointment_reference", "vehicle", "issued_at", "lines", "subtotal", "discount", "total",
            "paid_amount", "balance", "payments", "notes", "cancelled_at", "cancel_reason",
        ]
        read_only_fields = fields

    def get_vehicle(self, obj):
        v = obj.appointment.vehicle if obj.appointment else None
        return f"{v.brand} {v.model} — {v.registration}" if v else None


class InvoiceCreateSerializer(serializers.Serializer):
    appointment = serializers.PrimaryKeyRelatedField(queryset=Appointment.objects.all())
    lines = InvoiceLineSerializer(many=True, required=False)
    discount = serializers.IntegerField(min_value=0, default=0)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class PaymentCreateSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1)
    method = serializers.ChoiceField(choices=Payment.Method.choices)
    reference = serializers.CharField(required=False, allow_blank=True, max_length=100)


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=200)
