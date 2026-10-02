from django.db.models import Q
from django.http import FileResponse
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.core.permissions import is_manager, is_staff_member

from .models import Vehicle
from .photos import process_upload
from .serializers import VehicleSerializer


class VehicleViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Un client ne voit et ne modifie que ses véhicules ; le personnel voit tout,
    le manager/admin peut créer ou modifier pour n'importe quel client."""

    serializer_class = VehicleSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Vehicle.objects.select_related("customer")
        if not is_staff_member(user):
            customer = getattr(user, "customer", None)
            if customer is None:
                return qs.none()
            qs = qs.filter(customer=customer)
        customer_id = self.request.query_params.get("customer")
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(registration__icontains=q)
                | Q(brand__icontains=q)
                | Q(model__icontains=q)
                | Q(customer__full_name__icontains=q)
            )
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        if not is_staff_member(user):
            context["forced_customer"] = getattr(user, "customer", None)
        return context

    def _check_write(self):
        user = self.request.user
        if is_manager(user):
            return
        if is_staff_member(user):
            raise PermissionDenied("Action réservée au manager ou à l'administrateur.")
        if getattr(user, "customer", None) is None:
            raise PermissionDenied("Aucune fiche client liée à ce compte.")

    def perform_create(self, serializer):
        self._check_write()
        serializer.save()

    def perform_update(self, serializer):
        self._check_write()
        serializer.save()

    @action(detail=True, methods=["get", "post", "delete"], parser_classes=[MultiPartParser])
    def photo(self, request, pk=None):
        """GET : sert la photo (propriétaire ou personnel uniquement).
        POST (multipart, champ « photo ») : remplace la photo. DELETE : la retire."""
        vehicle = self.get_object()  # 404 si le véhicule n'appartient pas à l'utilisateur
        if request.method == "GET":
            if not vehicle.photo:
                raise NotFound("Aucune photo.")
            response = FileResponse(vehicle.photo.open("rb"), content_type="image/jpeg")
            response["Cache-Control"] = "private, max-age=86400"
            return response

        self._check_write()
        new_photo = None
        if request.method == "POST":
            upload = request.FILES.get("photo")
            if upload is None:
                return Response({"photo": "Fichier manquant."}, status=status.HTTP_400_BAD_REQUEST)
            new_photo = process_upload(upload)  # valide AVANT de toucher à l'ancienne photo
        if vehicle.photo:
            vehicle.photo.delete(save=False)
        if new_photo is not None:
            vehicle.photo.save("photo.jpg", new_photo, save=False)
        vehicle.save()
        return Response(self.get_serializer(vehicle).data)
