from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.appointments.selectors import visible_appointments
from apps.core.permissions import is_manager, is_staff_member
from apps.vehicles.photos import process_upload

from . import services
from .models import AppointmentPhoto, WorkshopStep


def _appointment(request, pk):
    """404 si le rendez-vous est hors du périmètre de l'utilisateur."""
    return get_object_or_404(visible_appointments(request.user).select_related("assigned_employee"), pk=pk)


class StepView(APIView):
    """POST /appointments/{id}/steps/{step_id}/  {"done": true|false}"""

    def post(self, request, pk, step_id):
        appointment = _appointment(request, pk)
        step = get_object_or_404(WorkshopStep, pk=step_id, appointment=appointment)
        done = serializers.BooleanField().to_internal_value(request.data.get("done", True))
        step = services.set_step(step, done, request.user)
        return Response(
            {
                "id": step.id,
                "order": step.order,
                "title": step.title,
                "done": step.done_at is not None,
                "done_at": step.done_at,
                "progress": services.progress(appointment),
            }
        )


def _photo_data(photo):
    return {
        "id": photo.id,
        "kind": photo.kind,
        "kind_display": photo.get_kind_display(),
        "caption": photo.caption,
        "url": f"/api/v1/appointments/{photo.appointment_id}/photos/{photo.id}/file/",
        "created_at": photo.created_at,
    }


class PhotoListView(APIView):
    """GET : photos d'un rendez-vous (client propriétaire ou équipe).
    POST (multipart : photo, kind, caption) : ajout par l'équipe."""

    parser_classes = [MultiPartParser, JSONParser]

    def get(self, request, pk):
        appointment = _appointment(request, pk)
        return Response([_photo_data(p) for p in appointment.photos.all()])

    def post(self, request, pk):
        appointment = _appointment(request, pk)
        if not is_staff_member(request.user):
            raise PermissionDenied("Seule l'équipe de l'atelier ajoute des photos d'intervention.")
        kind = request.data.get("kind")
        if kind not in AppointmentPhoto.Kind.values:
            return Response({"kind": "Type invalide (inspection, before, after)."}, status=status.HTTP_400_BAD_REQUEST)
        upload = request.FILES.get("photo")
        if upload is None:
            return Response({"photo": "Fichier manquant."}, status=status.HTTP_400_BAD_REQUEST)
        photo = AppointmentPhoto(
            appointment=appointment,
            kind=kind,
            caption=str(request.data.get("caption", ""))[:200],
            uploaded_by=request.user,
        )
        photo.image.save("photo.jpg", process_upload(upload), save=True)
        return Response(_photo_data(photo), status=status.HTTP_201_CREATED)


class PhotoDetailView(APIView):
    def delete(self, request, pk, photo_id):
        appointment = _appointment(request, pk)
        photo = get_object_or_404(AppointmentPhoto, pk=photo_id, appointment=appointment)
        if not (is_manager(request.user) or photo.uploaded_by_id == request.user.id):
            raise PermissionDenied("Seul l'auteur de la photo ou un manager peut la supprimer.")
        photo.image.delete(save=False)
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PhotoFileView(APIView):
    def get(self, request, pk, photo_id):
        appointment = _appointment(request, pk)
        photo = get_object_or_404(AppointmentPhoto, pk=photo_id, appointment=appointment)
        response = FileResponse(photo.image.open("rb"), content_type="image/jpeg")
        response["Cache-Control"] = "private, max-age=86400"
        return response
