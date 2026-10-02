"""Contenus publics administrables. Rien n'apparaît sur le site tant que ce
n'est pas publié (cahier des charges : pas de donnée présentée comme réelle
sans validation par l'entreprise)."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.catalog.models import Service
from apps.core.models import TimeStampedModel


class Project(TimeStampedModel):
    """Réalisation Avant / Après de la page publique « Réalisations »."""

    title = models.CharField("titre", max_length=150)
    vehicle_label = models.CharField("véhicule", max_length=150)
    category = models.CharField("catégorie", max_length=20, choices=Service.Category.choices)
    description = models.TextField("description", blank=True)
    services_performed = models.CharField("prestations réalisées", max_length=300, blank=True)
    duration_label = models.CharField("durée", max_length=50, blank=True)
    completed_on = models.DateField("réalisé le", null=True, blank=True)
    # Photos destinées au public (accord du propriétaire du véhicule requis)
    before_image = models.ImageField("photo avant", upload_to="gallery/%Y/")
    after_image = models.ImageField("photo après", upload_to="gallery/%Y/")
    is_published = models.BooleanField("publié", default=False)
    featured = models.BooleanField("mis en avant", default=False)
    sort_order = models.PositiveSmallIntegerField("ordre", default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        verbose_name = "réalisation"
        ordering = ["-featured", "sort_order", "-completed_on", "-id"]

    def __str__(self):
        return self.title


class Testimonial(TimeStampedModel):
    author = models.CharField("auteur", max_length=120)
    role = models.CharField("fonction / précision", max_length=150, blank=True)
    vehicle_label = models.CharField("véhicule", max_length=150, blank=True)
    quote = models.TextField("avis")
    consent_obtained = models.BooleanField("accord écrit du client pour publication", default=False)
    is_published = models.BooleanField("publié", default=False)
    sort_order = models.PositiveSmallIntegerField("ordre", default=0)

    class Meta:
        verbose_name = "avis client"
        verbose_name_plural = "avis clients"
        ordering = ["sort_order", "-id"]

    def clean(self):
        if self.is_published and not self.consent_obtained:
            raise ValidationError({"is_published": "Un avis ne peut être publié qu'avec l'accord du client."})

    def __str__(self):
        return f"{self.author} — {self.quote[:40]}"


class Highlight(TimeStampedModel):
    """Chiffre clé affiché sur l'accueil (ex. « 1 200 véhicules traités »)."""

    value = models.CharField("valeur", max_length=30)
    label = models.CharField("libellé", max_length=120)
    is_published = models.BooleanField("publié (chiffre vérifié)", default=False)
    sort_order = models.PositiveSmallIntegerField("ordre", default=0)

    class Meta:
        verbose_name = "chiffre clé"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.value} {self.label}"
