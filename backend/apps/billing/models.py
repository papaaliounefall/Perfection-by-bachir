from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel


class Invoice(TimeStampedModel):
    """Facture. Le statut n'est pas stocké : il est déduit des paiements, ce qui
    garantit que facture et encaissements restent toujours cohérents."""

    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        PARTIAL = "partial", "Partiellement payée"
        PAID = "paid", "Payée"
        REFUNDED = "refunded", "Remboursée"
        CANCELLED = "cancelled", "Annulée"

    number = models.CharField("numéro", max_length=20, unique=True)
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="invoices")
    appointment = models.ForeignKey(
        "appointments.Appointment", on_delete=models.PROTECT, null=True, blank=True, related_name="invoices"
    )
    issued_at = models.DateTimeField("émise le")
    discount = models.PositiveIntegerField("remise (FCFA)", default=0)
    notes = models.TextField("mentions", blank=True)
    cancelled_at = models.DateTimeField("annulée le", null=True, blank=True)
    cancel_reason = models.CharField("motif d'annulation", max_length=200, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        verbose_name = "facture"
        ordering = ["-issued_at", "-id"]
        constraints = [
            # Une seule facture active par rendez-vous
            models.UniqueConstraint(
                fields=["appointment"],
                condition=Q(cancelled_at__isnull=True),
                name="one_active_invoice_per_appointment",
            )
        ]

    def __str__(self):
        return self.number

    @property
    def subtotal(self) -> int:
        return sum(line.total for line in self.lines.all())

    @property
    def total(self) -> int:
        return max(self.subtotal - self.discount, 0)

    @property
    def paid_amount(self) -> int:
        return sum(p.amount for p in self.payments.all() if p.refunded_at is None)

    @property
    def balance(self) -> int:
        return max(self.total - self.paid_amount, 0)

    @property
    def status(self) -> str:
        if self.cancelled_at:
            return self.Status.CANCELLED
        payments = list(self.payments.all())
        if payments and all(p.refunded_at for p in payments):
            return self.Status.REFUNDED
        paid = self.paid_amount
        if paid >= self.total and self.total > 0:
            return self.Status.PAID
        return self.Status.PARTIAL if paid > 0 else self.Status.PENDING

    def get_status_display(self) -> str:
        return self.Status(self.status).label


class InvoiceLine(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="lines")
    label = models.CharField("désignation", max_length=200)
    quantity = models.PositiveSmallIntegerField("quantité", default=1)
    unit_price = models.PositiveIntegerField("prix unitaire (FCFA)")

    class Meta:
        verbose_name = "ligne de facture"
        ordering = ["id"]

    @property
    def total(self) -> int:
        return self.quantity * self.unit_price


class Payment(models.Model):
    """Encaissement enregistré manuellement (V1). Un remboursement le neutralise
    sans l'effacer, pour garder la trace comptable."""

    class Method(models.TextChoices):
        WAVE = "wave", "Wave"
        ORANGE_MONEY = "orange_money", "Orange Money"
        CARD = "card", "Carte bancaire"
        CASH = "cash", "Espèces"
        TRANSFER = "transfer", "Virement"

    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="payments")
    amount = models.PositiveIntegerField("montant (FCFA)")
    method = models.CharField("moyen de paiement", max_length=15, choices=Method.choices)
    reference = models.CharField("référence de transaction", max_length=100, blank=True)
    received_at = models.DateTimeField("reçu le", db_index=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    refunded_at = models.DateTimeField("remboursé le", null=True, blank=True)
    refunded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    refund_reason = models.CharField("motif du remboursement", max_length=200, blank=True)

    class Meta:
        verbose_name = "paiement"
        ordering = ["-received_at", "-id"]

    def __str__(self):
        return f"{self.invoice.number} · {self.amount} FCFA · {self.get_method_display()}"
