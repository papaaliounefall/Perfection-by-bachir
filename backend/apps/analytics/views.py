"""Statistiques calculées à partir des données réelles (aucune valeur saisie à la main).

Chiffre d'affaires = paiements encaissés sur la période, remboursements exclus.
"""

import csv
from datetime import date, timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.appointments.models import Appointment
from apps.billing.models import Payment
from apps.core.permissions import IsManager
from apps.customers.models import Customer

COMPLETED = [Appointment.Status.DONE, Appointment.Status.DELIVERED]
TRUNC = {"day": TruncDay, "week": TruncWeek, "month": TruncMonth}


def _period(request):
    today = timezone.localdate()
    try:
        start = date.fromisoformat(request.query_params.get("from", "")) if request.query_params.get("from") else today - timedelta(days=29)
        end = date.fromisoformat(request.query_params.get("to", "")) if request.query_params.get("to") else today
    except ValueError:
        raise ValidationError({"from": "Dates au format AAAA-MM-JJ."})
    if start > end:
        raise ValidationError({"from": "La date de début doit précéder la date de fin."})
    return start, end


class SummaryView(APIView):
    """GET /analytics/summary/?from=AAAA-MM-JJ&to=AAAA-MM-JJ&group=day|week|month"""

    permission_classes = [IsManager]

    def get(self, request):
        start, end = _period(request)
        group = request.query_params.get("group", "day")
        if group not in TRUNC:
            raise ValidationError({"group": "day, week ou month."})

        payments = Payment.objects.filter(
            refunded_at__isnull=True, received_at__date__gte=start, received_at__date__lte=end
        )
        revenue = payments.aggregate(total=Sum("amount"))["total"] or 0
        series = (
            payments.annotate(period=TRUNC[group]("received_at"))
            .values("period")
            .annotate(amount=Sum("amount"))
            .order_by("period")
        )
        by_method = payments.values("method").annotate(amount=Sum("amount"), count=Count("id")).order_by("-amount")

        appointments = Appointment.objects.filter(start_at__date__gte=start, start_at__date__lte=end)
        status_counts = dict(appointments.values_list("status").annotate(n=Count("id")))
        total_appointments = sum(status_counts.values())
        cancelled = sum(status_counts.get(s, 0) for s in ("cancelled", "refused", "no_show"))

        popular = (
            appointments.exclude(status__in=Appointment.NON_BLOCKING_STATUSES)
            .values("service__name")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )
        completed = appointments.filter(status__in=COMPLETED)
        customers_in_period = completed.values("customer").distinct()
        returning = (
            Customer.objects.filter(pk__in=customers_in_period)
            .annotate(done=Count("appointments", filter=Q(appointments__status__in=COMPLETED)))
            .filter(done__gte=2)
            .count()
        )

        return Response({
            "from": start.isoformat(),
            "to": end.isoformat(),
            "revenue": revenue,
            "revenue_series": [
                {"period": timezone.localtime(row["period"]).date().isoformat(), "amount": row["amount"]} for row in series
            ],
            "revenue_by_method": [
                {"method": dict(Payment.Method.choices)[row["method"]], "amount": row["amount"], "count": row["count"]}
                for row in by_method
            ],
            "appointments": {
                "total": total_appointments,
                "by_status": {Appointment.Status(k).label: v for k, v in status_counts.items()},
                "cancellations": cancelled,
                "cancellation_rate": round(cancelled * 100 / total_appointments, 1) if total_appointments else 0,
            },
            "popular_services": [{"service": r["service__name"], "count": r["count"]} for r in popular],
            "new_customers": Customer.objects.filter(created_at__date__gte=start, created_at__date__lte=end).count(),
            "returning_customers": returning,
            "vehicles_treated": completed.values("vehicle").distinct().count(),
        })


class ExportView(APIView):
    """GET /analytics/export/?type=appointments|payments&from=&to= → CSV (séparateur « ; », Excel FR)."""

    permission_classes = [IsManager]

    def get(self, request):
        start, end = _period(request)
        kind = request.query_params.get("type", "appointments")
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="perfection_{kind}_{start}_{end}.csv"'
        response.write("﻿")  # BOM : accents corrects à l'ouverture dans Excel
        writer = csv.writer(response, delimiter=";")

        if kind == "appointments":
            writer.writerow(["Référence", "Date", "Heure", "Client", "Téléphone", "Véhicule", "Immatriculation",
                             "Prestation", "Statut", "Technicien", "Prix estimé (FCFA)"])
            rows = Appointment.objects.filter(start_at__date__gte=start, start_at__date__lte=end).select_related(
                "customer", "vehicle", "service", "assigned_employee").order_by("start_at")
            for a in rows:
                local = timezone.localtime(a.start_at)
                writer.writerow([
                    a.reference, f"{local:%d/%m/%Y}", f"{local:%H:%M}", a.customer.full_name, a.customer.phone,
                    f"{a.vehicle.brand} {a.vehicle.model}", a.vehicle.registration, a.service.name,
                    a.get_status_display(), a.assigned_employee.full_name if a.assigned_employee else "",
                    a.price_estimate if a.price_estimate is not None else "",
                ])
        elif kind == "payments":
            writer.writerow(["Date", "Facture", "Client", "Moyen", "Référence", "Montant (FCFA)", "Remboursé"])
            rows = Payment.objects.filter(received_at__date__gte=start, received_at__date__lte=end).select_related(
                "invoice__customer").order_by("received_at")
            for p in rows:
                writer.writerow([
                    f"{timezone.localtime(p.received_at):%d/%m/%Y %H:%M}", p.invoice.number, p.invoice.customer.full_name,
                    p.get_method_display(), p.reference, p.amount, "oui" if p.refunded_at else "non",
                ])
        else:
            raise ValidationError({"type": "appointments ou payments."})
        return response
