from django.contrib.auth import password_validation
from django.db import transaction
from rest_framework import serializers

from apps.customers.models import Customer
from apps.customers.validators import normalize_phone

from .models import Role, User


class MeSerializer(serializers.ModelSerializer):
    customer_id = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "customer_id", "employee_id"]

    def get_customer_id(self, user):
        customer = getattr(user, "customer", None)
        return customer.id if customer else None

    def get_employee_id(self, user):
        employee = getattr(user, "employee", None)
        return employee.id if employee else None


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=30)
    password = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet email.")
        return value

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate(self, attrs):
        password_validation.validate_password(attrs["password"], User(email=attrs["email"]))
        return attrs

    @transaction.atomic
    def create(self, validated):
        first, _, last = validated["full_name"].strip().partition(" ")
        user = User.objects.create_user(
            email=validated["email"],
            password=validated["password"],
            first_name=first,
            last_name=last,
            role=Role.CLIENT,
        )
        # Pas de rattachement automatique à une fiche client existante :
        # sans vérification de l'email, cela exposerait l'historique d'un tiers.
        Customer.objects.create(
            user=user,
            full_name=validated["full_name"].strip(),
            email=validated["email"],
            phone=validated["phone"],
        )
        return user


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(trim_whitespace=False)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.context["request"].user)
        return value
