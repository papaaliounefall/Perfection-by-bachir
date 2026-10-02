from django.db.models import Max, Q, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.appointments.models import Appointment
from apps.core.permissions import ReadStaffWriteManager

from .models import Customer
from .serializers import ContactRequestSerializer, CustomerProfileSerializer, CustomerStaffSerializer

_COMPLETED = [Appointment.Status.DONE, Appointment.Status.DELIVERED]


class CustomerViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """CRM clients : lecture pour le personnel, écriture manager/admin.
    Pas de suppression : un client a un historique."""

    serializer_class = CustomerStaffSerializer
    permission_classes = [ReadStaffWriteManager]

    def get_queryset(self):
        completed = Q(appointments__status__in=_COMPLETED)
        qs = Customer.objects.annotate(
            completed_amount=Coalesce(
                Sum("appointments__price_estimate", filter=completed), Value(0)
            ),
            last_service_at=Max("appointments__start_at", filter=completed),
        )
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(full_name__icontains=q)
                | Q(email__icontains=q)
                | Q(phone__icontains=q)
                | Q(vehicles__registration__icontains=q)
            ).distinct()
        return qs

    @action(detail=False, methods=["get", "patch"], permission_classes=[IsAuthenticated])
    def me(self, request):
        customer = getattr(request.user, "customer", None)
        if customer is None:
            raise NotFound("Aucune fiche client liée à ce compte.")
        if request.method == "PATCH":
            serializer = CustomerProfileSerializer(customer, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(CustomerProfileSerializer(customer).data)


class ContactRequestView(APIView):
    """POST /contact/ — formulaire public (limité en débit)."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "contact"

    def post(self, request):
        serializer = ContactRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_201_CREATED)
