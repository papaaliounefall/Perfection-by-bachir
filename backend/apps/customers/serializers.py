from rest_framework import serializers

from .models import ContactRequest, Customer
from .validators import normalize_phone


class CustomerProfileSerializer(serializers.ModelSerializer):
    """Vue du client sur sa propre fiche (sans notes internes ni segment)."""

    class Meta:
        model = Customer
        fields = ["id", "full_name", "email", "phone", "address", "created_at"]
        read_only_fields = ["id", "email", "created_at"]

    def validate_phone(self, value):
        return normalize_phone(value)


class CustomerStaffSerializer(serializers.ModelSerializer):
    has_account = serializers.SerializerMethodField()
    completed_amount = serializers.IntegerField(read_only=True, default=0)
    last_service_at = serializers.DateTimeField(read_only=True, default=None)

    class Meta:
        model = Customer
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "address",
            "segment",
            "internal_notes",
            "has_account",
            "completed_amount",
            "last_service_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_has_account(self, obj):
        return obj.user_id is not None

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate_email(self, value):
        return value.lower()


class ContactRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactRequest
        fields = ["full_name", "email", "phone", "message"]

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate_message(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Message trop court.")
        return value.strip()
