from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, viewsets

from apps.appointments.models import Appointment
from apps.core.permissions import ReadStaffWriteManager

from .models import Employee
from .serializers import EmployeeSerializer


class EmployeeViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = EmployeeSerializer
    permission_classes = [ReadStaffWriteManager]

    def get_queryset(self):
        today = timezone.localdate()
        return Employee.objects.annotate(
            today_appointments=Count(
                "appointments",
                filter=Q(appointments__start_at__date=today)
                & ~Q(appointments__status__in=Appointment.NON_BLOCKING_STATUSES),
            )
        )
