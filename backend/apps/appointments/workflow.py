"""Cycle de vie d'un rendez-vous.

Parcours principal :
    À confirmer → Confirmé → Véhicule reçu → En cours → Contrôle final → Terminé → Restitué
États alternatifs : Annulé, Refusé, Absent, Reporté.

Le client dépose lui-même son véhicule (check_in) et revient le chercher
(deliver) : ces deux étapes se font au comptoir, en sa présence.

Le statut n'est jamais modifiable directement : seules les actions ci-dessous,
contrôlées par rôle, le font évoluer.
"""

from dataclasses import dataclass
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from apps.accounts.models import Role
from apps.core.permissions import has_role, is_manager

from .models import Appointment

S = Appointment.Status


@dataclass(frozen=True)
class Transition:
    sources: frozenset
    target: str
    label: str


TRANSITIONS = {
    "confirm": Transition(frozenset({S.PENDING, S.RESCHEDULED}), S.CONFIRMED, "Confirmer"),
    "refuse": Transition(frozenset({S.PENDING}), S.REFUSED, "Refuser"),
    "check_in": Transition(frozenset({S.CONFIRMED}), S.RECEIVED, "Réceptionner le véhicule déposé"),
    "start": Transition(frozenset({S.RECEIVED}), S.IN_PROGRESS, "Démarrer"),
    "submit_quality_check": Transition(
        frozenset({S.IN_PROGRESS}), S.QUALITY_CHECK, "Passer au contrôle final"
    ),
    "rework": Transition(frozenset({S.QUALITY_CHECK}), S.IN_PROGRESS, "Reprendre le traitement"),
    "complete": Transition(frozenset({S.QUALITY_CHECK}), S.DONE, "Valider et terminer"),
    "deliver": Transition(frozenset({S.DONE}), S.DELIVERED, "Restituer au client"),
    "no_show": Transition(frozenset({S.CONFIRMED}), S.NO_SHOW, "Client absent"),
    "cancel": Transition(
        frozenset({S.PENDING, S.CONFIRMED, S.RESCHEDULED}), S.CANCELLED, "Annuler"
    ),
}

# Actions qu'un technicien peut effectuer sur les prestations qui lui sont affectées
TECHNICIAN_ACTIONS = {"start", "submit_quality_check"}
# Accueil au comptoir : tout technicien peut réceptionner un véhicule déposé
# par le client et le lui restituer, même sans être affecté au rendez-vous
COUNTER_ACTIONS = {"check_in", "deliver"}

MAIN_FLOW = [S.PENDING, S.CONFIRMED, S.RECEIVED, S.IN_PROGRESS, S.QUALITY_CHECK, S.DONE, S.DELIVERED]


def progress(status: str):
    """Avancement (0–100) déduit des étapes réellement validées, pas du temps écoulé."""
    if status not in MAIN_FLOW:
        return None
    return round(MAIN_FLOW.index(status) * 100 / (len(MAIN_FLOW) - 1))


def role_allows(user, appointment: Appointment, action: str) -> bool:
    if is_manager(user):
        return True
    if has_role(user, Role.TECHNICIAN):
        if action in COUNTER_ACTIONS:
            return True
        employee = appointment.assigned_employee
        return (
            action in TECHNICIAN_ACTIONS
            and employee is not None
            and employee.user_id == user.id
        )
    if has_role(user, Role.CLIENT) and action == "cancel":
        min_delay = timedelta(hours=settings.WORKSHOP["CANCELLATION_MIN_HOURS"])
        return (
            appointment.customer.user_id == user.id
            and appointment.start_at - timezone.now() >= min_delay
        )
    return False


def allowed_actions(user, appointment: Appointment) -> list[str]:
    return [
        name
        for name, t in TRANSITIONS.items()
        if appointment.status in t.sources and role_allows(user, appointment, name)
    ]
