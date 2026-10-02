"""Suivi atelier : étapes de traitement et avancement réel."""

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from apps.appointments.services import Conflict
from apps.core.permissions import is_manager

from .models import WorkshopStep

DEFAULT_STEPS = ["Diagnostic et préparation", "Exécution du protocole", "Finition et nettoyage"]


def create_steps(appointment) -> None:
    """À la réception du véhicule : étapes tirées du protocole de la prestation."""
    if appointment.steps.exists():
        return
    titles = [s.get("title") for s in appointment.service.process_steps or [] if s.get("title")] or DEFAULT_STEPS
    WorkshopStep.objects.bulk_create(
        WorkshopStep(appointment=appointment, order=i, title=title[:150]) for i, title in enumerate(titles, 1)
    )


def all_steps_done(appointment) -> bool:
    return not appointment.steps.filter(done_at__isnull=True).exists()


def can_work_on(user, appointment) -> bool:
    if is_manager(user):
        return True
    employee = appointment.assigned_employee
    return employee is not None and employee.user_id == user.id


def set_step(step: WorkshopStep, done: bool, user) -> WorkshopStep:
    from apps.appointments.models import Appointment

    with transaction.atomic():
        appointment = Appointment.objects.select_for_update().get(pk=step.appointment_id)
        if appointment.status != Appointment.Status.IN_PROGRESS:
            raise Conflict("Les étapes se valident pendant le traitement (statut « En cours »).")
        if not can_work_on(user, appointment):
            raise PermissionDenied("Seul le technicien affecté ou un manager peut valider les étapes.")
        step.done_at = timezone.now() if done else None
        step.done_by = user if done else None
        step.save(update_fields=["done_at", "done_by"])
    return step


def progress(appointment):
    """Avancement 0–100 fondé sur les étapes réellement validées.

    Chaque statut du parcours vaut un palier ; pendant le traitement,
    l'avancement progresse étape par étape jusqu'au palier suivant.
    """
    from apps.appointments.workflow import MAIN_FLOW

    status = appointment.status
    if status not in MAIN_FLOW:
        return None
    span = 100 / (len(MAIN_FLOW) - 1)
    value = MAIN_FLOW.index(status) * span
    if status == "in_progress":
        steps = list(appointment.steps.all())
        if steps:
            value += span * sum(1 for s in steps if s.done_at) / len(steps)
    return round(value)
