from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        abstract = True


class Sequence(models.Model):
    """Compteur transactionnel servant aux références métier (RDV-AAAAXXXX…)."""

    key = models.CharField(max_length=64, primary_key=True)
    value = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "séquence"

    def __str__(self):
        return f"{self.key} = {self.value}"


class AuditLog(models.Model):
    """Trace des actions sensibles : qui, quand, quel objet, ancienne/nouvelle valeur."""

    actor = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    action = models.CharField("action", max_length=60)
    object_type = models.CharField("type d'objet", max_length=60)
    object_id = models.CharField("identifiant", max_length=40)
    object_repr = models.CharField("objet", max_length=200)
    changes = models.JSONField("modifications", default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "journal d'audit"
        verbose_name_plural = "journal d'audit"
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.created_at:%d/%m/%Y %H:%M} · {self.action} · {self.object_repr}"
