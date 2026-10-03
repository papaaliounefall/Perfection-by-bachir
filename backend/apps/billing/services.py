"""Règles de facturation et d'encaissement. Chaque opération est auditée."""

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.appointments.models import Appointment
from apps.appointments.services import Conflict
from apps.core import sequences
from apps.core.audit import record
from apps.notifications.services import send_to_customer

from .models import Invoice, InvoiceLine, Payment

INVOICEABLE = [Appointment.Status.DONE, Appointment.Status.DELIVERED]


def _fcfa(amount: int) -> str:
    return f"{amount:,}".replace(",", " ") + " FCFA"


def create_invoice(*, appointment, user, lines=None, discount=0, notes="") -> Invoice:
    if appointment.status not in INVOICEABLE:
        raise Conflict("Une facture s'établit pour une prestation terminée.")
    if not lines:
        if appointment.price_estimate is None:
            raise ValidationError({"lines": "Prestation sur devis : précisez les lignes de la facture."})
        lines = [{"label": appointment.service.name, "quantity": 1, "unit_price": appointment.price_estimate}]
    subtotal = sum(line["quantity"] * line["unit_price"] for line in lines)
    if discount > subtotal:
        raise ValidationError({"discount": "La remise dépasse le montant de la facture."})

    try:
        with transaction.atomic():
            year = timezone.localdate().year
            invoice = Invoice.objects.create(
                number=f"INV-{year}-{sequences.next_value(f'invoice-{year}'):04d}",
                customer=appointment.customer,
                appointment=appointment,
                issued_at=timezone.now(),
                discount=discount,
                notes=notes,
                created_by=user,
            )
            InvoiceLine.objects.bulk_create(InvoiceLine(invoice=invoice, **line) for line in lines)
            record(user, "invoice.create", invoice, {"total": [None, invoice.total]})
    except IntegrityError:
        raise Conflict("Ce rendez-vous a déjà une facture active.")

    send_to_customer(
        invoice.customer,
        "invoice",
        "Facture disponible",
        f"Votre facture {invoice.number} de {_fcfa(invoice.total)} est disponible dans votre espace client.",
        appointment,
    )
    return invoice


def active_invoice(appointment):
    return appointment.invoices.filter(cancelled_at__isnull=True).first()


def balance_due(appointment) -> int:
    invoice = active_invoice(appointment)
    return invoice.balance if invoice else 0


def ensure_invoice(appointment, user):
    """Crée la facture à la validation de la prestation si le prix est connu.
    Prestation sur devis : le manager l'établit lui-même."""
    if appointment.price_estimate is None or active_invoice(appointment):
        return active_invoice(appointment)
    return create_invoice(appointment=appointment, user=user)


def record_payment(*, invoice_id, amount, method, reference, user) -> Payment:
    with transaction.atomic():
        invoice = Invoice.objects.select_for_update().get(pk=invoice_id)
        if invoice.cancelled_at:
            raise Conflict("Facture annulée : aucun encaissement possible.")
        if amount <= 0:
            raise ValidationError({"amount": "Montant invalide."})
        if amount > invoice.balance:
            raise ValidationError({"amount": f"Le montant dépasse le reste à payer ({_fcfa(invoice.balance)})."})
        payment = Payment.objects.create(
            invoice=invoice,
            amount=amount,
            method=method,
            reference=reference,
            received_at=timezone.now(),
            recorded_by=user,
        )
        record(user, "payment.create", payment, {"amount": [None, amount], "method": [None, method]})

    send_to_customer(
        invoice.customer,
        "payment",
        "Paiement reçu",
        f"Nous avons bien reçu {_fcfa(amount)} ({payment.get_method_display()}) pour la facture {invoice.number}. "
        f"Reste à payer : {_fcfa(invoice.balance)}.",
        invoice.appointment,
    )
    return payment


def refund_payment(*, payment_id, reason, user) -> Payment:
    with transaction.atomic():
        payment = Payment.objects.select_for_update().select_related("invoice").get(pk=payment_id)
        if payment.refunded_at:
            raise Conflict("Ce paiement est déjà remboursé.")
        payment.refunded_at = timezone.now()
        payment.refunded_by = user
        payment.refund_reason = reason
        payment.save(update_fields=["refunded_at", "refunded_by", "refund_reason"])
        record(user, "payment.refund", payment, {"refunded": [False, True], "reason": [None, reason]})
    return payment


def cancel_invoice(*, invoice_id, reason, user) -> Invoice:
    with transaction.atomic():
        invoice = Invoice.objects.select_for_update().get(pk=invoice_id)
        if invoice.cancelled_at:
            raise Conflict("Facture déjà annulée.")
        if invoice.paid_amount > 0:
            raise Conflict("Remboursez d'abord les paiements avant d'annuler la facture.")
        invoice.cancelled_at = timezone.now()
        invoice.cancel_reason = reason
        invoice.save(update_fields=["cancelled_at", "cancel_reason", "updated_at"])
        record(user, "invoice.cancel", invoice, {"reason": [None, reason]})
    return invoice
