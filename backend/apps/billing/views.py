from django.db.models import Q
from django.http import HttpResponse
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.appointments.selectors import visible_appointments
from apps.core.permissions import IsManager, IsStaffMember, is_manager, is_staff_member

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
            # Comptoir : factures des rendez-vous visibles par le technicien (véhicules prêts…)
            return qs.filter(appointment__in=visible_appointments(user))
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

    @action(detail=True, methods=["post"], permission_classes=[IsStaffMember])
    def payments(self, request, pk=None):
        """Encaissement : manager, ou technicien au comptoir (paiement signé de son nom).
        Remboursement, annulation et remise restent réservés au manager."""
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

    @action(detail=False, methods=["get"], url_path="cash-report")
    def cash_report(self, request):
        """Journal de caisse d'une journée : totaux par moyen et par personne."""
        from datetime import date as date_cls

        from django.db.models import Count, Sum
        from django.utils import timezone

        try:
            day = date_cls.fromisoformat(request.query_params.get("date", "")) if request.query_params.get("date") else timezone.localdate()
        except ValueError:
            return Response({"date": "Format AAAA-MM-JJ."}, status=status.HTTP_400_BAD_REQUEST)
        payments = Payment.objects.filter(received_at__date=day).select_related("invoice__customer", "recorded_by")
        active = payments.filter(refunded_at__isnull=True)
        methods = dict(Payment.Method.choices)
        by_method = [
            {"method": methods[r["method"]], "amount": r["total"], "count": r["n"]}
            for r in active.values("method").annotate(total=Sum("amount"), n=Count("id")).order_by("-total")
        ]
        by_person = [
            {"person": r["recorded_by__email"] or "—", "amount": r["total"], "count": r["n"], "cash": r["cash"] or 0}
            for r in active.values("recorded_by__email")
            .annotate(total=Sum("amount"), n=Count("id"), cash=Sum("amount", filter=Q(method=Payment.Method.CASH)))
            .order_by("-total")
        ]
        return Response({
            "date": day.isoformat(),
            "total": active.aggregate(t=Sum("amount"))["t"] or 0,
            "cash_total": active.filter(method=Payment.Method.CASH).aggregate(t=Sum("amount"))["t"] or 0,
            "by_method": by_method,
            "by_person": by_person,
            "payments": PaymentSerializer(payments, many=True).data,
        })

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        payment = self.get_object()
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        payment = services.refund_payment(payment_id=payment.pk, reason=data.validated_data["reason"], user=request.user)
        return Response(self.get_serializer(payment).data)
