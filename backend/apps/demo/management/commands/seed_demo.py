"""Jeu de données de DÉMONSTRATION — jamais à exécuter en production.

    python manage.py seed_demo --password <mot-de-passe>

Crée horaires, catalogue (tarifs non validés), comptes de test, équipe,
un client avec véhicules et quelques rendez-vous. Idempotent.
"""

from datetime import datetime, time, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.accounts.models import Role, User
from apps.appointments.models import Appointment, OpeningHours
from apps.appointments.services import create_booking
from apps.catalog.models import Service
from apps.customers.models import Customer
from apps.employees.models import Employee
from apps.vehicles.models import Vehicle

DEMO_DOMAIN = "demo.perfection.local"

SERVICES = [
    ("Detailing automobile", "detailing", 50000, 240, "2h - 4h", "/images/hero_luxury_sedan.jpg",
     "Décontamination complète, correction légère et remise à neuf de l'habitacle."),
    ("Nettoyage intérieur", "cleaning", 25000, 120, "1h - 2h", "/images/service_interior_leather.jpg",
     "Aspiration, shampoing des tissus et soin des cuirs."),
    ("Nettoyage extérieur", "cleaning", 15000, 120, "1h - 2h", "/images/vehicle_land_cruiser.jpg",
     "Lavage à la main, jantes et vitres."),
    ("Polissage & Correction", "polishing", 40000, 240, "2h - 4h", "/images/service_polishing_detail.jpg",
     "Correction des micro-rayures et hologrammes."),
    ("Protection carrosserie", "protection", 80000, 360, "3h - 6h", "/images/before_after_paint_correction.jpg",
     "Protection céramique longue durée."),
    ("Traitement antirouille", "protection", 35000, 180, "2h - 3h", "/images/vehicle_land_cruiser.jpg",
     "Protection des soubassements contre l'air salin."),
    ("Préparation automobile", "preparation", 100000, 480, "4h - 8h", "/images/hero_luxury_sedan.jpg",
     "Préparation esthétique complète avant vente ou événement."),
]

TEAM = [
    ("Bachir Ndour", "Fondateur & chef d'atelier", "Correction de peinture", Role.MANAGER),
    ("Moussa Sow", "Technicien detailing", "Céramique", Role.TECHNICIAN),
    ("Ibrahima Fall", "Technicien", "Intérieur & cuirs", Role.TECHNICIAN),
]


class Command(BaseCommand):
    help = "Charge des données de démonstration (développement uniquement)."

    def add_arguments(self, parser):
        parser.add_argument("--password", required=True, help="Mot de passe des comptes démo")
        parser.add_argument("--force", action="store_true", help="Autoriser hors DEBUG")

    @transaction.atomic
    def handle(self, *args, password, force, **options):
        if not settings.DEBUG and not force:
            raise CommandError("Refusé hors DEBUG (utiliser --force en connaissance de cause).")

        for weekday in range(7):
            OpeningHours.objects.update_or_create(
                weekday=weekday,
                defaults=(
                    {"is_closed": True, "opens_at": None, "closes_at": None}
                    if weekday == 6
                    else {"is_closed": False, "opens_at": time(8, 30), "closes_at": time(18, 30)}
                ),
            )

        services = []
        for order, (name, cat, price, minutes, label, image, summary) in enumerate(SERVICES):
            service, _ = Service.objects.update_or_create(
                name=name,
                defaults={
                    "slug": slugify(name),
                    "category": cat,
                    "price": price,
                    "pricing_type": Service.PricingType.FROM,
                    "duration_minutes": minutes,
                    "duration_label": label,
                    "image_url": image,
                    "short_description": summary,
                    "sort_order": order,
                },
            )
            services.append(service)

        def user(email, role, first, last, superuser=False):
            u, created = User.objects.get_or_create(
                email=email,
                defaults={"role": role, "first_name": first, "last_name": last,
                          "is_staff": superuser, "is_superuser": superuser},
            )
            if created:
                u.set_password(password)
                u.save()
            return u

        user(f"admin@{DEMO_DOMAIN}", Role.ADMIN, "Admin", "Démo", superuser=True)

        employees = []
        for full_name, title, specialty, role in TEAM:
            first, last = full_name.split(" ", 1)
            slug = full_name.lower().replace(" ", ".")
            account = user(f"{slug}@{DEMO_DOMAIN}", role, first, last)
            emp, _ = Employee.objects.get_or_create(
                full_name=full_name,
                defaults={"user": account, "job_title": title, "specialty": specialty},
            )
            employees.append(emp)

        client_user = user(f"client@{DEMO_DOMAIN}", Role.CLIENT, "Mamadou", "Diallo")
        customer, _ = Customer.objects.get_or_create(
            user=client_user,
            defaults={"full_name": "Mamadou Diallo", "email": client_user.email,
                      "phone": "+221770000000", "address": "Almadies, Dakar"},
        )
        cruiser, _ = Vehicle.objects.get_or_create(
            customer=customer, registration="DK-0001-DEMO",
            defaults={"brand": "Toyota", "model": "Land Cruiser 300", "year": 2024,
                      "fuel": Vehicle.Fuel.DIESEL, "color": "Noir",
                      "photo_url": "/images/vehicle_land_cruiser.jpg"},
        )
        Vehicle.objects.get_or_create(
            customer=customer, registration="DK-0002-DEMO",
            defaults={"brand": "Mercedes-Benz", "model": "Classe S", "year": 2023,
                      "fuel": Vehicle.Fuel.PETROL, "color": "Gris",
                      "photo_url": "/images/hero_luxury_sedan.jpg"},
        )

        if not Appointment.objects.filter(customer=customer).exists():
            day = timezone.localdate() + timedelta(days=1)
            while day.weekday() == 6:
                day += timedelta(days=1)
            tz = timezone.get_current_timezone()
            for hour, service in ((9, services[0]), (14, services[3])):
                start = timezone.make_aware(datetime.combine(day, time(hour, 0)), tz)
                appt = create_booking(service=service, start_at=start, customer=customer,
                                      vehicle=cruiser, notes="Rendez-vous de démonstration")
                appt.assigned_employee = employees[1]
                appt.save(update_fields=["assigned_employee"])

        self.stdout.write(self.style.SUCCESS(
            f"Données démo chargées. Comptes : admin@, bachir.ndour@, moussa.sow@, client@{DEMO_DOMAIN}"
        ))
