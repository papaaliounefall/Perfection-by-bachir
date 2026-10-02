from datetime import datetime

from django.utils import timezone
from rest_framework import serializers

from apps.catalog.models import Service
from apps.customers.models import Customer
from apps.customers.validators import normalize_phone
from apps.employees.models import Employee
from apps.vehicles.models import Vehicle
from apps.vehicles.serializers import normalize_registration

from .models import Appointment, AppointmentStatusHistory
from .workflow import allowed_actions


class _VehicleSummary(serializers.ModelSerializer):
    photo_url = serializers.CharField(source="display_photo_url", read_only=True)

    class Meta:
        model = Vehicle
        fields = ["id", "brand", "model", "registration", "photo_url"]


class _CustomerSummary(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "full_name", "phone", "email"]


class _StepSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order = serializers.IntegerField()
    title = serializers.CharField()
    done = serializers.SerializerMethodField()
    done_at = serializers.DateTimeField()

    def get_done(self, step):
        return step.done_at is not None


class AppointmentSerializer(serializers.ModelSerializer):
    """Représentation commune (client et personnel) — sans notes internes."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    progress = serializers.SerializerMethodField()
    allowed_actions = serializers.SerializerMethodField()
    service_id = serializers.IntegerField(source="service.id", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)
    vehicle = _VehicleSummary(read_only=True)
    customer = _CustomerSummary(read_only=True)
    assigned_employee_name = serializers.CharField(
        source="assigned_employee.full_name", read_only=True, default=None
    )
    steps = _StepSerializer(many=True, read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "reference",
            "status",
            "status_display",
            "progress",
            "allowed_actions",
            "service_id",
            "service_name",
            "vehicle",
            "customer",
            "start_at",
            "end_at",
            "price_estimate",
            "customer_notes",
            "assigned_employee_name",
            "steps",
            "created_at",
        ]
        read_only_fields = fields

    def get_progress(self, obj):
        from apps.workshop.services import progress

        return progress(obj)

    def get_allowed_actions(self, obj):
        request = self.context.get("request")
        return allowed_actions(request.user, obj) if request else []


class _HistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.CharField(source="changed_by.email", default=None)

    class Meta:
        model = AppointmentStatusHistory
        fields = ["action", "from_status", "to_status", "note", "changed_by", "created_at"]


class StaffAppointmentSerializer(AppointmentSerializer):
    history = _HistorySerializer(many=True, read_only=True)
    assigned_employee = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta(AppointmentSerializer.Meta):
        fields = AppointmentSerializer.Meta.fields + [
            "assigned_employee",
            "internal_notes",
            "history",
        ]
        read_only_fields = fields


def _local_datetime(day, time):
    return timezone.make_aware(datetime.combine(day, time), timezone.get_current_timezone())


class _NewVehicleInput(serializers.Serializer):
    brand = serializers.CharField(max_length=60)
    model = serializers.CharField(max_length=80)
    registration = serializers.CharField(max_length=20)
    year = serializers.IntegerField(required=False, allow_null=True, min_value=1950)
    fuel = serializers.ChoiceField(choices=Vehicle.Fuel.choices, required=False, allow_blank=True)
    color = serializers.CharField(max_length=60, required=False, allow_blank=True)

    def validate_registration(self, value):
        return normalize_registration(value)


class _ContactInput(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=30)
    email = serializers.EmailField()

    def validate_phone(self, value):
        return normalize_phone(value)


class BookingSerializer(serializers.Serializer):
    """Réservation publique, client connecté ou saisie par le personnel.

    La résolution client/véhicule est faite ici ; la création (et la
    vérification du créneau) dans services.create_booking.
    """

    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.filter(is_active=True))
    date = serializers.DateField()
    time = serializers.TimeField()
    vehicle = serializers.IntegerField(required=False)
    new_vehicle = _NewVehicleInput(required=False)
    contact = _ContactInput(required=False)
    customer = serializers.IntegerField(required=False)  # personnel uniquement
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, attrs):
        if ("vehicle" in attrs) == ("new_vehicle" in attrs):
            raise serializers.ValidationError("Choisir un véhicule existant OU en décrire un nouveau.")
        attrs["start_at"] = _local_datetime(attrs["date"], attrs["time"])
        return attrs

    def resolve_customer(self, user, is_staff):
        data = self.validated_data
        if is_staff:
            if "customer" not in data:
                raise serializers.ValidationError({"customer": "Client obligatoire."})
            try:
                return Customer.objects.get(pk=data["customer"])
            except Customer.DoesNotExist:
                raise serializers.ValidationError({"customer": "Client inconnu."})

        own = getattr(user, "customer", None) if user.is_authenticated else None
        if own is not None:
            return own

        contact = data.get("contact")
        if contact is None:
            raise serializers.ValidationError({"contact": "Coordonnées obligatoires."})
        # Réservation sans compte : on réutilise uniquement une fiche « invitée »
        # (sans compte) aux coordonnées identiques, jamais celle d'un compte.
        guest = Customer.objects.filter(
            user__isnull=True, email=contact["email"].lower(), phone=contact["phone"]
        ).first()
        return guest or Customer.objects.create(
            full_name=contact["full_name"], email=contact["email"].lower(), phone=contact["phone"]
        )

    def resolve_vehicle(self, customer):
        data = self.validated_data
        if "vehicle" in data:
            try:
                return Vehicle.objects.get(pk=data["vehicle"], customer=customer)
            except Vehicle.DoesNotExist:
                raise serializers.ValidationError({"vehicle": "Véhicule inconnu."})
        spec = data["new_vehicle"]
        vehicle, _ = Vehicle.objects.get_or_create(
            customer=customer,
            registration=spec["registration"],
            defaults={
                "brand": spec["brand"],
                "model": spec["model"],
                "year": spec.get("year"),
                "fuel": spec.get("fuel", ""),
                "color": spec.get("color", ""),
            },
        )
        return vehicle


class RescheduleSerializer(serializers.Serializer):
    date = serializers.DateField()
    time = serializers.TimeField()
    note = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        attrs["start_at"] = _local_datetime(attrs["date"], attrs["time"])
        return attrs


class TransitionSerializer(serializers.Serializer):
    action = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True)


class AssignSerializer(serializers.Serializer):
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.filter(is_active=True), allow_null=True
    )


class NotesSerializer(serializers.Serializer):
    internal_notes = serializers.CharField(allow_blank=True)
