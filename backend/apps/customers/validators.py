import re

from rest_framework import serializers

_PHONE_RE = re.compile(r"^\+?\d{7,15}$")


def normalize_phone(value: str) -> str:
    """Retire espaces, points et tirets ; exige 7 à 15 chiffres (préfixe + optionnel)."""
    cleaned = re.sub(r"[\s.\-()]", "", value or "")
    if not _PHONE_RE.match(cleaned):
        raise serializers.ValidationError("Numéro de téléphone invalide.")
    return cleaned
