"""Notifications client à chaque étape d'un rendez-vous : in-app (si le client a
un compte) et email (y compris pour une réservation sans compte).

Envoyées après le commit de la transaction : un rendez-vous annulé par une
erreur ne déclenche jamais de message.
"""

import logging

from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import Notification

logger = logging.getLogger(__name__)

# Événement → (titre, message). Les étapes internes (contrôle qualité, reprise,
# affectation) ne sont pas notifiées au client.
MESSAGES = {
    "create": ("Demande de rendez-vous enregistrée", "Votre demande {ref} pour {service} le {when} a bien été reçue. L’atelier va la confirmer."),
    "confirm": ("Rendez-vous confirmé", "Votre rendez-vous {ref} est confirmé pour le {when}. Déposez votre {vehicle} à l’atelier à l’heure prévue."),
    "refuse": ("Demande non retenue", "Votre demande {ref} du {when} n’a pas pu être acceptée. Contactez l’atelier pour un autre créneau."),
    "reschedule": ("Rendez-vous reporté", "Votre rendez-vous {ref} est déplacé au {when}."),
    "check_in": ("Véhicule reçu", "Votre {vehicle} a bien été déposé à l’atelier."),
    "start": ("Prestation commencée", "Les travaux ({service}) ont commencé sur votre {vehicle}."),
    "complete": ("Votre véhicule est prêt", "Votre {vehicle} est prêt : vous pouvez venir le récupérer à l’atelier."),
    "deliver": ("Véhicule restitué", "Votre {vehicle} vous a été restitué. Merci de votre confiance !"),
    "no_show": ("Rendez-vous manqué", "Nous ne vous avons pas vu au rendez-vous {ref} du {when}. Contactez-nous pour reprogrammer."),
    "cancel": ("Rendez-vous annulé", "Votre rendez-vous {ref} du {when} est annulé."),
}


def notify_customer(appointment, event: str) -> None:
    template = MESSAGES.get(event)
    if template is None:
        return
    customer = appointment.customer
    title, body = template
    message = body.format(
        ref=appointment.reference,
        service=appointment.service.name,
        vehicle=f"{appointment.vehicle.brand} {appointment.vehicle.model}",
        when=timezone.localtime(appointment.start_at).strftime("%d/%m/%Y à %H:%M"),
    )
    send_to_customer(customer, event, title, message, appointment)


def send_to_customer(customer, kind: str, title: str, message: str, appointment=None) -> None:
    """In-app si le client a un compte, et email dans tous les cas (après commit)."""
    if customer.user_id:
        Notification.objects.create(
            recipient_id=customer.user_id,
            kind=kind,
            title=title,
            message=message,
            appointment=appointment,
        )

    if customer.email:
        def send():
            try:
                send_mail(f"Perfection — {title}", message, None, [customer.email])
            except Exception:  # un email en échec ne doit jamais bloquer l'atelier
                logger.exception("Échec d'envoi de la notification %s à %s", kind, customer.email)

        transaction.on_commit(send)


# --- Notifications de l'équipe (in-app uniquement) ---

STAFF_MESSAGES = {
    # événement → (destinataires, titre, message)
    "create": ("managers", "Nouvelle demande de réservation", "{ref} · {customer} · {service} le {when}. À confirmer."),
    "cancel": ("managers", "Rendez-vous annulé par le client", "{ref} · {customer} · {service} du {when}. Le créneau est libéré."),
    "submit_quality_check": ("managers", "Contrôle final à valider", "{ref} · {vehicle} ({service}) attend votre validation."),
    "assign": ("assignee", "Nouvelle prestation affectée", "{ref} · {service} sur {vehicle}, le {when}."),
    "check_in": ("assignee", "Véhicule déposé", "{ref} · {vehicle} est à l’atelier : vous pouvez démarrer {service}."),
}


def _staff_recipients(appointment, audience):
    from apps.accounts.models import Role, User

    if audience == "managers":
        return list(User.objects.filter(role__in=[Role.MANAGER, Role.ADMIN], is_active=True))
    employee = appointment.assigned_employee
    if employee and employee.user_id and employee.user.is_active:
        return [employee.user]
    return []


def notify_staff(appointment, event: str, actor=None) -> None:
    config = STAFF_MESSAGES.get(event)
    if config is None:
        return
    # Une annulation faite par l'atelier lui-même n'a pas besoin d'être signalée
    if event == "cancel" and actor is not None and getattr(actor, "role", None) != "client":
        return
    audience, title, body = config
    message = body.format(
        ref=appointment.reference,
        customer=appointment.customer.full_name,
        service=appointment.service.name,
        vehicle=f"{appointment.vehicle.brand} {appointment.vehicle.model}",
        when=timezone.localtime(appointment.start_at).strftime("%d/%m/%Y à %H:%M"),
    )
    actor_id = actor.pk if actor is not None and actor.is_authenticated else None
    Notification.objects.bulk_create(
        Notification(recipient=user, kind=event, title=title, message=message, appointment=appointment)
        for user in _staff_recipients(appointment, audience)
        if user.pk != actor_id  # pas de notification pour sa propre action
    )
