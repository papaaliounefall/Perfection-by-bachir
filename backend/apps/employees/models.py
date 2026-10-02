from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Employee(TimeStampedModel):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Disponible"
        BUSY = "busy", "Occupé"
        BREAK = "break", "En pause"
        ABSENT = "absent", "Absent"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee",
    )
    full_name = models.CharField("nom complet", max_length=150)
    job_title = models.CharField("fonction", max_length=100)
    specialty = models.CharField("spécialité", max_length=150, blank=True)
    phone = models.CharField("téléphone", max_length=20, blank=True)
    email = models.EmailField("email", blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.AVAILABLE)
    is_active = models.BooleanField("actif", default=True)

    class Meta:
        verbose_name = "membre de l'équipe"
        verbose_name_plural = "équipe"
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name
