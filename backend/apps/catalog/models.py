from django.db import models

from apps.core.models import TimeStampedModel


class Service(TimeStampedModel):
    class Category(models.TextChoices):
        DETAILING = "detailing", "Detailing"
        CLEANING = "cleaning", "Nettoyage"
        POLISHING = "polishing", "Polissage"
        PROTECTION = "protection", "Protection"
        PREPARATION = "preparation", "Préparation"

    class PricingType(models.TextChoices):
        FIXED = "fixed", "Prix fixe"
        FROM = "from", "À partir de"
        QUOTE = "quote", "Sur devis"

    name = models.CharField("nom", max_length=120)
    slug = models.SlugField(unique=True, max_length=140)
    category = models.CharField("catégorie", max_length=20, choices=Category.choices)
    short_description = models.CharField("résumé", max_length=255, blank=True)
    description = models.TextField("description détaillée", blank=True)
    pricing_type = models.CharField(
        "tarification", max_length=10, choices=PricingType.choices, default=PricingType.FROM
    )
    # Montant en FCFA (pas de centimes) ; nul si « sur devis »
    price = models.PositiveIntegerField("prix (FCFA)", null=True, blank=True)
    # Durée bloquée dans le planning (sert au calcul des disponibilités)
    duration_minutes = models.PositiveIntegerField("durée planifiée (min)")
    # Libellé affiché au public, ex. « 2h - 4h »
    duration_label = models.CharField("durée affichée", max_length=40, blank=True)
    image_url = models.CharField("image", max_length=500, blank=True)
    benefits = models.JSONField("bénéfices", default=list, blank=True)
    process_steps = models.JSONField("protocole", default=list, blank=True)
    # Une prestation désactivée n'est plus réservable mais reste dans l'historique
    is_active = models.BooleanField("réservable", default=True)
    sort_order = models.PositiveSmallIntegerField("ordre", default=0)

    class Meta:
        verbose_name = "prestation"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name
