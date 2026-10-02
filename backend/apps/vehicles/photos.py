"""Traitement des photos de véhicules envoyées par les utilisateurs.

- Contrôle du type réel (Pillow), pas seulement de l'extension ou du MIME déclaré.
- Taille maximale à l'envoi, redimensionnement, ré-encodage JPEG : supprime
  les métadonnées EXIF (dont la position GPS) et tout contenu caché.
- Les fichiers sont privés : servis uniquement via l'API, après contrôle d'accès.
"""

import io
import uuid

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_SIDE = 1600
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

# Protection contre les « bombes de décompression »
Image.MAX_IMAGE_PIXELS = 40_000_000


def process_upload(upload) -> ContentFile:
    if upload.size > MAX_UPLOAD_BYTES:
        raise ValidationError({"photo": "Image trop lourde (5 Mo maximum)."})
    try:
        image = Image.open(upload)
        image_format = image.format
        image.verify()  # détecte les fichiers corrompus ou falsifiés
        upload.seek(0)
        image = Image.open(upload)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise ValidationError({"photo": "Fichier image invalide."})
    if image_format not in ALLOWED_FORMATS:
        raise ValidationError({"photo": "Formats acceptés : JPEG, PNG ou WebP."})

    image = ImageOps.exif_transpose(image)  # respecte l'orientation du téléphone
    image = image.convert("RGB")
    image.thumbnail((MAX_SIDE, MAX_SIDE))

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=85, optimize=True)
    return ContentFile(buffer.getvalue(), name=f"{uuid.uuid4().hex}.jpg")
