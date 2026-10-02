from django.db import models

from apps.core.models import TimeStampedModel


class Vehicle(TimeStampedModel):
    class Fuel(models.TextChoices):
        DIESEL = "diesel", "Diesel"
        PETROL = "petrol", "Essence"
        HYBRID = "hybrid", "Hybride"
        ELECTRIC = "electric", "Électrique"

    customer = models.ForeignKey(
        "customers.Customer", on_delete=models.PROTECT, related_name="vehicles"
    )
    brand = models.CharField("marque", max_length=60)
    model = models.CharField("modèle", max_length=80)
    year = models.PositiveSmallIntegerField("année", null=True, blank=True)
    registration = models.CharField("immatriculation", max_length=20)
    color = models.CharField("couleur", max_length=60, blank=True)
    fuel = models.CharField("motorisation", max_length=10, choices=Fuel.choices, blank=True)
    # Photo envoyée par le client ou l'atelier (fichier privé, servi par l'API)
    photo = models.ImageField("photo", upload_to="vehicles/%Y/%m/", blank=True)
    # Image externe (données de démonstration uniquement)
    photo_url = models.CharField("image externe", max_length=500, blank=True)
    notes = models.TextField("notes atelier", blank=True)

    class Meta:
        verbose_name = "véhicule"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["customer", "registration"], name="unique_registration_per_customer"
            )
        ]

    def __str__(self):
        return f"{self.brand} {self.model} ({self.registration})"

    @property
    def display_photo_url(self) -> str:
        if self.photo:
            # Le paramètre v évite qu'un navigateur garde l'ancienne photo en cache
            return f"/api/v1/vehicles/{self.pk}/photo/?v={int(self.updated_at.timestamp())}"
        return self.photo_url
