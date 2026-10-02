"""Périmètre de visibilité des rendez-vous par rôle — utilisé par toutes les
vues qui exposent un rendez-vous ou ses dépendances (étapes, photos, factures)."""

from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import Role
from apps.core.permissions import has_role, is_manager

from .models import Appointment


def visible_appointments(user):
    qs = Appointment.objects.all()
    if is_manager(user):
        return qs
    if has_role(user, Role.TECHNICIAN):
        # Ses prestations + le comptoir : dépôts attendus aujourd'hui et
        # véhicules prêts que le client peut venir récupérer
        S = Appointment.Status
        return qs.filter(
            Q(assigned_employee__user=user)
            | Q(status=S.CONFIRMED, start_at__date=timezone.localdate())
            | Q(status=S.DONE)
        )
    customer = getattr(user, "customer", None) if user.is_authenticated else None
    if customer is None:
        return qs.none()
    return qs.filter(customer=customer)
