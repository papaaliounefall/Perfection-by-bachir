from django.conf import settings
from django.db import models


class Notification(models.Model):
    """Notification in-app d'un utilisateur (client connecté)."""

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    kind = models.CharField("type", max_length=30)
    title = models.CharField("titre", max_length=150)
    message = models.TextField("message")
    appointment = models.ForeignKey(
        "appointments.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    read_at = models.DateTimeField("lue le", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "notification"
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["recipient", "read_at"])]

    def __str__(self):
        return f"{self.recipient} — {self.title}"
