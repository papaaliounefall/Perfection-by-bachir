"""Journalisation des opérations sensibles (cahier des charges §28)."""

from .models import AuditLog


def diff(instance, data: dict, fields) -> dict:
    """{champ: [ancienne, nouvelle]} pour les champs suivis réellement modifiés."""
    changes = {}
    for field in fields:
        if field in data:
            old, new = getattr(instance, field), data[field]
            if old != new:
                changes[field] = [_plain(old), _plain(new)]
    return changes


def record(actor, action: str, obj, changes: dict | None = None) -> None:
    AuditLog.objects.create(
        actor=actor if actor is not None and actor.is_authenticated else None,
        action=action,
        object_type=obj._meta.label,
        object_id=str(obj.pk),
        object_repr=str(obj)[:200],
        changes=changes or {},
    )


def _plain(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)
