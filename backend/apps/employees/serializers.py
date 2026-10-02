from rest_framework import serializers

from .models import Employee


class EmployeeSerializer(serializers.ModelSerializer):
    today_appointments = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Employee
        fields = [
            "id",
            "full_name",
            "job_title",
            "specialty",
            "phone",
            "email",
            "status",
            "is_active",
            "today_appointments",
        ]
        read_only_fields = ["id"]
