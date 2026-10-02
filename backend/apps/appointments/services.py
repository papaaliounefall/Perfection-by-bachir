"""Règles métier des rendez-vous. Les vues n'appellent que ces fonctions."""

from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from apps.core import sequences
from apps.notifications.services import notify_customer, notify_staff

from .availability import is_slot_available
from .models import Appointment, AppointmentStatusHistory
from .workflow import TRANSITIONS, role_allows

# Verrou commun à toute opération qui occupe un créneau (évite les doubles réservations)
BOOKING_LOCK = "booking-lock"


class Conflict(APIException):
    status_code = 409
    default_detail = "Opération impossible dans l'état actuel du rendez-vous."
    default_code = "conflict"


def _log(appointment, action, from_status, user, note=""):
    AppointmentStatusHistory.objects.create(
        appointment=appointment,
        action=action,
        from_status=from_status,
        to_status=appointment.status,
        note=note,
        changed_by=user if user and user.is_authenticated else None,
    )
    notify_customer(appointment, action)
    notify_staff(appointment, action, actor=user)


def _new_reference(start_at) -> str:
    year = timezone.localtime(start_at).year
    number = sequences.next_value(f"appointment-{year}")
    return f"RDV-{year}{number:04d}"


def create_booking(*, service, start_at, customer, vehicle, notes="", user=None) -> Appointment:
    if not service.is_active:
        raise ValidationError({"service": "Cette prestation n'est plus réservable."})
    if vehicle.customer_id != customer.id:
        raise ValidationError({"vehicle": "Véhicule inconnu."})

    with transaction.atomic():
        sequences.lock(BOOKING_LOCK)
        if not is_slot_available(service, start_at):
            raise Conflict("Ce créneau n'est plus disponible. Merci d'en choisir un autre.")
        appointment = Appointment.objects.create(
            reference=_new_reference(start_at),
            customer=customer,
            vehicle=vehicle,
            service=service,
            start_at=start_at,
            end_at=start_at + timedelta(minutes=service.duration_minutes),
            price_estimate=service.price,
            customer_notes=notes,
            created_by=user if user and user.is_authenticated else None,
        )
        _log(appointment, "create", "", user)
    return appointment


def apply_transition(appointment_id, action, user, note="") -> Appointment:
    transition = TRANSITIONS.get(action)
    if transition is None:
        raise ValidationError({"action": "Action inconnue."})

    with transaction.atomic():
        appointment = (
            Appointment.objects.select_for_update()
            .select_related("customer", "assigned_employee")
            .get(pk=appointment_id)
        )
        if appointment.status not in transition.sources:
            raise Conflict(
                f"Impossible de « {transition.label.lower()} » un rendez-vous "
                f"« {appointment.get_status_display()} »."
            )
        if not role_allows(user, appointment, action):
            raise PermissionDenied("Vous n'avez pas le droit d'effectuer cette action.")
        from apps.workshop import services as workshop  # import local : évite un cycle

        if action == "submit_quality_check" and not workshop.all_steps_done(appointment):
            raise Conflict("Toutes les étapes de traitement doivent être validées avant le contrôle final.")
        previous = appointment.status
        appointment.status = transition.target
        appointment.save(update_fields=["status", "updated_at"])
        if action == "check_in":
            workshop.create_steps(appointment)
        _log(appointment, action, previous, user, note)
    return appointment


def reschedule(appointment_id, new_start, user, note="") -> Appointment:
    reschedulable = {
        Appointment.Status.PENDING,
        Appointment.Status.CONFIRMED,
        Appointment.Status.RESCHEDULED,
    }
    with transaction.atomic():
        sequences.lock(BOOKING_LOCK)
        appointment = (
            Appointment.objects.select_for_update().select_related("service").get(pk=appointment_id)
        )
        if appointment.status not in reschedulable:
            raise Conflict("Ce rendez-vous ne peut plus être reporté.")
        if not is_slot_available(
            appointment.service, new_start, exclude_appointment_id=appointment.id
        ):
            raise Conflict("Ce créneau n'est pas disponible.")
        previous = appointment.status
        old_start = appointment.start_at
        appointment.start_at = new_start
        appointment.end_at = new_start + (appointment.end_at - old_start)
        appointment.status = Appointment.Status.RESCHEDULED
        appointment.save(update_fields=["start_at", "end_at", "status", "updated_at"])
        detail = f"{timezone.localtime(old_start):%d/%m/%Y %H:%M} → {timezone.localtime(new_start):%d/%m/%Y %H:%M}"
        _log(appointment, "reschedule", previous, user, f"{detail}. {note}".strip())
    return appointment


def assign(appointment_id, employee, user) -> Appointment:
    with transaction.atomic():
        appointment = Appointment.objects.select_for_update().get(pk=appointment_id)
        if appointment.status in Appointment.NON_BLOCKING_STATUSES:
            raise Conflict("Rendez-vous clôturé.")
        appointment.assigned_employee = employee
        appointment.save(update_fields=["assigned_employee", "updated_at"])
        label = employee.full_name if employee else "personne"
        _log(appointment, "assign", appointment.status, user, f"Affecté à {label}")
    return appointment
