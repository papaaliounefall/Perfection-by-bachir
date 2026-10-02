from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Appointment(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "À confirmer"
        CONFIRMED = "confirmed", "Confirmé"
        RECEIVED = "received", "Véhicule reçu"
        IN_PROGRESS = "in_progress", "En cours"
        QUALITY_CHECK = "quality_check", "Contrôle final"
        DONE = "done", "Terminé"
        DELIVERED = "delivered", "Restitué"
        CANCELLED = "cancelled", "Annulé"
        REFUSED = "refused", "Refusé"
        NO_SHOW = "no_show", "Absent"
        RESCHEDULED = "rescheduled", "Reporté"

    # Statuts qui libèrent le créneau dans le planning
    NON_BLOCKING_STATUSES = [Status.CANCELLED, Status.REFUSED, Status.NO_SHOW]

    reference = models.CharField("référence", max_length=20, unique=True)
    customer = models.ForeignKey(
        "customers.Customer", on_delete=models.PROTECT, related_name="appointments"
    )
    vehicle = models.ForeignKey(
        "vehicles.Vehicle", on_delete=models.PROTECT, related_name="appointments"
    )
    service = models.ForeignKey(
        "catalog.Service", on_delete=models.PROTECT, related_name="appointments"
    )
    start_at = models.DateTimeField("début", db_index=True)
    end_at = models.DateTimeField("fin prévue", db_index=True)
    status = models.CharField(
        "statut", max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    assigned_employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointments",
    )
    # Prix figé au moment de la réservation (le tarif du catalogue peut évoluer)
    price_estimate = models.PositiveIntegerField("prix estimé (FCFA)", null=True, blank=True)
    customer_notes = models.TextField("instructions du client", blank=True)
    internal_notes = models.TextField("notes internes", blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        verbose_name = "rendez-vous"
        verbose_name_plural = "rendez-vous"
        ordering = ["-start_at"]

    def __str__(self):
        return f"{self.reference} — {self.service} ({self.get_status_display()})"


class AppointmentStatusHistory(models.Model):
    """Journal de chaque changement : qui, quand, ancienne et nouvelle valeur."""

    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name="history")
    action = models.CharField(max_length=30)
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    note = models.TextField(blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "historique de statut"
        ordering = ["created_at", "id"]


class OpeningHours(models.Model):
    class Weekday(models.IntegerChoices):
        MONDAY = 0, "Lundi"
        TUESDAY = 1, "Mardi"
        WEDNESDAY = 2, "Mercredi"
        THURSDAY = 3, "Jeudi"
        FRIDAY = 4, "Vendredi"
        SATURDAY = 5, "Samedi"
        SUNDAY = 6, "Dimanche"

    weekday = models.PositiveSmallIntegerField("jour", choices=Weekday.choices, unique=True)
    is_closed = models.BooleanField("fermé", default=False)
    opens_at = models.TimeField("ouverture", null=True, blank=True)
    closes_at = models.TimeField("fermeture", null=True, blank=True)

    class Meta:
        verbose_name = "horaire d'ouverture"
        verbose_name_plural = "horaires d'ouverture"
        ordering = ["weekday"]

    def __str__(self):
        if self.is_closed or not self.opens_at:
            return f"{self.get_weekday_display()} : fermé"
        return f"{self.get_weekday_display()} : {self.opens_at:%H:%M}–{self.closes_at:%H:%M}"


class Closure(models.Model):
    """Fermeture exceptionnelle ou blocage administratif (jours inclus)."""

    start_date = models.DateField("du")
    end_date = models.DateField("au")
    reason = models.CharField("motif", max_length=200, blank=True)

    class Meta:
        verbose_name = "fermeture"
        ordering = ["start_date"]

    def __str__(self):
        return f"{self.start_date} → {self.end_date} {self.reason}".strip()
