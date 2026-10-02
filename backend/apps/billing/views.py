from django.http import HttpResponse
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.core.permissions import IsManager, is_manager, is_staff_member

from . import services
from .models import Invoice, Payment
from .pdf import render_invoice
from .serializers import (
    InvoiceCreateSerializer,
    InvoiceSerializer,
    PaymentCreateSerializer,
    PaymentSerializer,
    ReasonSerializer,
)


class InvoiceViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Client : ses factures (lecture + PDF). Manager/admin : tout.
    Les techniciens n'ont pas accès aux finances (cahier des charges §19)."""

    serializer_class = InvoiceSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.select_related("customer", "appointment__vehicle").prefetch_related("lines", "payments")
        if is_manager(user):
            customer = self.request.query_params.get("customer")
            return qs.filter(customer_id=customer) if customer else qs
        if is_staff_member(user):
            raise PermissionDenied("Accès réservé au manager et à l'administrateur.")
        customer = getattr(user, "customer", None)
        return qs.filter(customer=customer) if customer else qs.none()

    def _fresh(self, pk):
        return Response(self.get_serializer(self.get_queryset().get(pk=pk)).data)

    def create(self, request):
        if not is_manager(request.user):
            raise PermissionDenied("Action réservée au manager.")
        data = InvoiceCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        invoice = services.create_invoice(
            appointment=data.validated_data["appointment"],
            user=request.user,
            lines=data.validated_data.get("lines"),
            discount=data.validated_data["discount"],
            notes=data.validated_data.get("notes", ""),
        )
        response = self._fresh(invoice.pk)
        response.status_code = status.HTTP_201_CREATED
        return response

    @action(detail=True, methods=["post"], permission_classes=[IsManager])
    def payments(self, request, pk=None):
        invoice = self.get_object()
        data = PaymentCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.record_payment(
            invoice_id=invoice.pk,
            user=request.user,
            amount=data.validated_data["amount"],
            method=data.validated_data["method"],
            reference=data.validated_data.get("reference", ""),
        )
        return self._fresh(invoice.pk)

    @action(detail=True, methods=["post"], permission_classes=[IsManager])
    def cancel(self, request, pk=None):
        invoice = self.get_object()
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.cancel_invoice(invoice_id=invoice.pk, reason=data.validated_data["reason"], user=request.user)
        return self._fresh(invoice.pk)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        response = HttpResponse(render_invoice(invoice), content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{invoice.number}.pdf"'
        return response


class PaymentViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Journal des encaissements (manager/admin)."""

    serializer_class = PaymentSerializer
    permission_classes = [IsManager]

    def get_queryset(self):
        qs = Payment.objects.select_related("invoice")
        params = self.request.query_params
        if params.get("date_from"):
            qs = qs.filter(received_at__date__gte=params["date_from"])
        if params.get("date_to"):
            qs = qs.filter(received_at__date__lte=params["date_to"])
        if params.get("method"):
            qs = qs.filter(method=params["method"])
        return qs

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        payment = self.get_object()
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        payment = services.refund_payment(payment_id=payment.pk, reason=data.validated_data["reason"], user=request.user)
        return Response(self.get_serializer(payment).data)
