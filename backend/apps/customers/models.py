from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Customer(TimeStampedModel):
    class Segment(models.TextChoices):
        NEW = "new", "Nouveau"
        ACTIVE = "active", "Actif"
        VIP = "vip", "VIP"

    # Nul pour un client ayant réservé sans compte
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer",
    )
    full_name = models.CharField("nom complet", max_length=150)
    email = models.EmailField("email", db_index=True)
    phone = models.CharField("téléphone / WhatsApp", max_length=20, db_index=True)
    address = models.CharField("adresse", max_length=255, blank=True)
    segment = models.CharField(max_length=10, choices=Segment.choices, default=Segment.NEW)
    # Strictement réservé au personnel : jamais sérialisé vers le client
    internal_notes = models.TextField("notes internes", blank=True)

    class Meta:
        verbose_name = "client"
        ordering = ["-created_at"]

    def __str__(self):
        return self.full_name


class ContactRequest(TimeStampedModel):
    """Message envoyé depuis le formulaire de contact du site public."""

    full_name = models.CharField("nom", max_length=150)
    email = models.EmailField("email", blank=True)
    phone = models.CharField("téléphone", max_length=20)
    message = models.TextField("message")
    handled = models.BooleanField("traité", default=False)

    class Meta:
        verbose_name = "demande de contact"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} — {self.created_at:%d/%m/%Y}"
