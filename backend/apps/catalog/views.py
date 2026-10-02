from rest_framework import mixins, viewsets
from rest_framework.permissions import SAFE_METHODS, AllowAny

from apps.core.audit import diff, record
from apps.core.permissions import IsManager, is_staff_member

from .models import Service
from .serializers import ServiceSerializer


class ServiceViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Catalogue public (prestations actives) ; le personnel voit aussi les
    prestations suspendues. Pas de suppression : on désactive (is_active)."""

    serializer_class = ServiceSerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [IsManager()]

    def get_queryset(self):
        qs = Service.objects.all()
        if not is_staff_member(self.request.user):
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        service = serializer.save()
        record(self.request.user, "service.create", service, {"price": [None, service.price]})

    def perform_update(self, serializer):
        changes = diff(
            serializer.instance,
            serializer.validated_data,
            ["name", "price", "pricing_type", "duration_minutes", "is_active"],
        )
        service = serializer.save()
        if changes:
            record(self.request.user, "service.update", service, changes)
