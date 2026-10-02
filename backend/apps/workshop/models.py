from django.conf import settings
from django.db import models


class WorkshopStep(models.Model):
    """Étape de traitement d'un rendez-vous, validée par le technicien."""

    appointment = models.ForeignKey("appointments.Appointment", on_delete=models.CASCADE, related_name="steps")
    order = models.PositiveSmallIntegerField("ordre")
    title = models.CharField("étape", max_length=150)
    done_at = models.DateTimeField("validée le", null=True, blank=True)
    done_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        verbose_name = "étape de traitement"
        ordering = ["appointment", "order"]
        constraints = [models.UniqueConstraint(fields=["appointment", "order"], name="unique_step_order")]

    def __str__(self):
        return f"{self.order}. {self.title}"


class AppointmentPhoto(models.Model):
    """Photo privée d'une intervention (servie par l'API après contrôle d'accès)."""

    class Kind(models.TextChoices):
        INSPECTION = "inspection", "Inspection à la réception"
        BEFORE = "before", "Avant"
        AFTER = "after", "Après"

    appointment = models.ForeignKey("appointments.Appointment", on_delete=models.CASCADE, related_name="photos")
    kind = models.CharField("type", max_length=12, choices=Kind.choices)
    image = models.ImageField("photo", upload_to="appointments/%Y/%m/")
    caption = models.CharField("légende", max_length=200, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "photo d'intervention"
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"{self.appointment.reference} · {self.get_kind_display()}"
