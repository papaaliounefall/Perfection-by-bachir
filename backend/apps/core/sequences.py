from django.db import transaction

from .models import Sequence


def next_value(key: str) -> int:
    """Incrémente et retourne le compteur `key`.

    Doit être appelé dans une transaction : la ligne est verrouillée
    (SELECT … FOR UPDATE) jusqu'au commit, ce qui sérialise les appels
    concurrents sur la même clé.
    """
    if not transaction.get_connection().in_atomic_block:
        raise RuntimeError("next_value() doit être appelé dans transaction.atomic().")
    Sequence.objects.get_or_create(key=key)
    seq = Sequence.objects.select_for_update().get(key=key)
    seq.value += 1
    seq.save(update_fields=["value"])
    return seq.value


def lock(key: str) -> None:
    """Verrou applicatif sur `key` jusqu'à la fin de la transaction courante."""
    Sequence.objects.get_or_create(key=key)
    Sequence.objects.select_for_update().get(key=key)
