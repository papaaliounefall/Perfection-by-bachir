import re

from django.utils import timezone
from rest_framework import serializers

from apps.customers.models import Customer

from .models import Vehicle


def normalize_registration(value: str) -> str:
    cleaned = re.sub(r"\s+", "-", (value or "").strip().upper())
    if not re.fullmatch(r"[A-Z0-9\-]{4,20}", cleaned):
        raise serializers.ValidationError("Immatriculation invalide.")
    return cleaned


class VehicleSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(), required=False
    )
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    # Lecture seule : une photo s'envoie via POST /vehicles/{id}/photo/
    photo_url = serializers.CharField(source="display_photo_url", read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            "id",
            "customer",
            "customer_name",
            "brand",
            "model",
            "year",
            "registration",
            "color",
            "fuel",
            "photo_url",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_registration(self, value):
        return normalize_registration(value)

    def validate_year(self, value):
        if value is not None and not 1950 <= value <= timezone.now().year + 1:
            raise serializers.ValidationError("Année invalide.")
        return value

    def validate(self, attrs):
        # Un client ne peut agir que sur sa propre fiche : la vue impose le client
        forced = self.context.get("forced_customer")
        if forced is not None:
            attrs["customer"] = forced
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        if customer is None:
            raise serializers.ValidationError({"customer": "Client obligatoire."})
        registration = attrs.get("registration")
        if customer and registration:
            clash = Vehicle.objects.filter(customer=customer, registration=registration)
            if self.instance:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError(
                    {"registration": "Ce véhicule est déjà enregistré."}
                )
        return attrs
