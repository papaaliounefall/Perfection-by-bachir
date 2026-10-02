from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.catalog.models import Service
from apps.core.permissions import IsManager, IsStaffMember, is_manager, is_staff_member
from apps.customers.models import Customer

from . import services
from .availability import compute_slots
from .models import Appointment, OpeningHours
from .selectors import visible_appointments
from .serializers import (
    AppointmentSerializer,
    AssignSerializer,
    BookingSerializer,
    NotesSerializer,
    RescheduleSerializer,
    StaffAppointmentSerializer,
    TransitionSerializer,
)


class AppointmentViewSet(viewsets.ReadOnlyModelViewSet):
    """Lecture filtrée par rôle + actions métier. Aucune écriture directe du statut."""

    def get_serializer_class(self):
        if is_staff_member(self.request.user):
            return StaffAppointmentSerializer
        return AppointmentSerializer

    def get_queryset(self):
        qs = (
            visible_appointments(self.request.user)
            .select_related("service", "vehicle", "customer", "assigned_employee")
            .prefetch_related("history__changed_by", "steps")
        )

        params = self.request.query_params
        if params.get("status"):
            qs = qs.filter(status__in=params["status"].split(","))
        if params.get("date"):
            qs = qs.filter(start_at__date=params["date"])
        if params.get("date_from"):
            qs = qs.filter(start_at__date__gte=params["date_from"])
        if params.get("date_to"):
            qs = qs.filter(start_at__date__lte=params["date_to"])
        for field in ("customer", "vehicle", "service"):
            if params.get(field):
                qs = qs.filter(**{f"{field}_id": params[field]})
        if params.get("employee"):
            qs = qs.filter(assigned_employee_id=params["employee"])
        return qs

    def _respond(self, appointment):
        # L'action a déjà été autorisée ; le rendez-vous peut ensuite sortir du
        # périmètre de l'utilisateur (ex. véhicule reçu au comptoir par un
        # technicien non affecté) : on renvoie quand même son nouvel état.
        fresh = (
            self.get_queryset().filter(pk=appointment.pk).first()
            or Appointment.objects.select_related(
                "service", "vehicle", "customer", "assigned_employee"
            ).get(pk=appointment.pk)
        )
        return Response(self.get_serializer(fresh).data)

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        appointment = self.get_object()  # 404 si hors périmètre de l'utilisateur
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = services.apply_transition(
            appointment.pk,
            serializer.validated_data["action"],
            request.user,
            serializer.validated_data.get("note", ""),
        )
        return self._respond(updated)

    @action(detail=True, methods=["post"], permission_classes=[IsManager])
    def reschedule(self, request, pk=None):
        appointment = self.get_object()
        serializer = RescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = services.reschedule(
            appointment.pk,
            serializer.validated_data["start_at"],
            request.user,
            serializer.validated_data.get("note", ""),
        )
        return self._respond(updated)

    @action(detail=True, methods=["post"], permission_classes=[IsManager])
    def assign(self, request, pk=None):
        appointment = self.get_object()
        serializer = AssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = services.assign(appointment.pk, serializer.validated_data["employee"], request.user)
        return self._respond(updated)

    @action(detail=True, methods=["patch"], permission_classes=[IsStaffMember])
    def notes(self, request, pk=None):
        appointment = self.get_object()
        serializer = NotesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment.internal_notes = serializer.validated_data["internal_notes"]
        appointment.save(update_fields=["internal_notes", "updated_at"])
        return self._respond(appointment)


class BookingView(APIView):
    """POST /bookings/ — ouvert aux visiteurs (limité en débit)."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "booking"

    def post(self, request):
        serializer = BookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        staff = is_manager(request.user)
        with transaction.atomic():
            customer = serializer.resolve_customer(request.user, staff)
            vehicle = serializer.resolve_vehicle(customer)
            appointment = services.create_booking(
                service=serializer.validated_data["service"],
                start_at=serializer.validated_data["start_at"],
                customer=customer,
                vehicle=vehicle,
                notes=serializer.validated_data.get("notes", ""),
                user=request.user,
            )
        data = AppointmentSerializer(appointment, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED)


def _get_service(request):
    service_id = request.query_params.get("service")
    if not service_id:
        raise ValidationError({"service": "Paramètre obligatoire."})
    try:
        return Service.objects.get(pk=service_id, is_active=True)
    except (Service.DoesNotExist, ValueError):
        raise ValidationError({"service": "Prestation inconnue ou non réservable."})


def _parse_date(value, field):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValidationError({field: "Date invalide (AAAA-MM-JJ)."})


class AvailabilityView(APIView):
    """GET /availability/?service=<id>&date=AAAA-MM-JJ → créneaux du jour."""

    permission_classes = [AllowAny]

    def get(self, request):
        service = _get_service(request)
        day = _parse_date(request.query_params.get("date"), "date")
        slots = compute_slots(service, day)
        return Response(
            {
                "date": day.isoformat(),
                "service": service.id,
                "slots": [
                    {"time": timezone.localtime(s.start).strftime("%H:%M"), "available": s.available}
                    for s in slots
                ],
            }
        )


class AvailabilityDaysView(APIView):
    """GET /availability/days/?service=<id>&from=AAAA-MM-JJ&days=14 → jours réservables."""

    permission_classes = [AllowAny]

    def get(self, request):
        service = _get_service(request)
        start = request.query_params.get("from")
        start = _parse_date(start, "from") if start else timezone.localdate()
        try:
            days = min(max(int(request.query_params.get("days", 14)), 1), 31)
        except ValueError:
            raise ValidationError({"days": "Nombre invalide."})
        result = []
        for offset in range(days):
            day = start + timedelta(days=offset)
            free = sum(1 for s in compute_slots(service, day) if s.available)
            result.append({"date": day.isoformat(), "available_slots": free})
        return Response(result)


class DashboardSummaryView(APIView):
    """Indicateurs du jour pour le dashboard professionnel."""

    permission_classes = [IsManager]

    def get(self, request):
        today = timezone.localdate()
        S = Appointment.Status
        todays = Appointment.objects.filter(start_at__date=today).exclude(
            status__in=Appointment.NON_BLOCKING_STATUSES
        )
        return Response(
            {
                "date": today.isoformat(),
                "appointments_today": todays.count(),
                "to_confirm": Appointment.objects.filter(status=S.PENDING).count(),
                "in_workshop": Appointment.objects.filter(
                    status__in=[S.RECEIVED, S.IN_PROGRESS, S.QUALITY_CHECK, S.DONE]
                ).count(),
                "in_progress": Appointment.objects.filter(status=S.IN_PROGRESS).count(),
                "completed_today": Appointment.objects.filter(
                    status__in=[S.DONE, S.DELIVERED], updated_at__date=today
                ).count(),
                "new_customers_30d": Customer.objects.filter(
                    created_at__date__gte=today - timedelta(days=30)
                ).count(),
            }
        )


class OpeningHoursView(APIView):
    """GET /opening-hours/ — horaires publics (configurés dans l'admin)."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            [
                {
                    "weekday": h.weekday,
                    "label": h.get_weekday_display(),
                    "is_closed": h.is_closed or not h.opens_at,
                    "opens_at": h.opens_at.strftime("%H:%M") if h.opens_at else None,
                    "closes_at": h.closes_at.strftime("%H:%M") if h.closes_at else None,
                }
                for h in OpeningHours.objects.all()
            ]
        )
