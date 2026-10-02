from datetime import time

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.appointments.models import OpeningHours

from .models import ContactRequest, Customer


class PublicEndpointsTests(TestCase):
    def setUp(self):
        self.api = APIClient()

    def test_contact_request_is_stored_and_validated(self):
        ok = self.api.post(
            "/api/v1/contact/",
            {"full_name": "Awa", "phone": "77 000 00 00", "message": "Un devis svp"},
            format="json",
        )
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(ContactRequest.objects.get().phone, "770000000")
        bad = self.api.post("/api/v1/contact/", {"full_name": "A", "phone": "abc", "message": "x"}, format="json")
        self.assertEqual(bad.status_code, 400)

    def test_opening_hours_are_public(self):
        OpeningHours.objects.create(weekday=0, opens_at=time(8, 30), closes_at=time(18, 30))
        OpeningHours.objects.create(weekday=6, is_closed=True)
        data = self.api.get("/api/v1/opening-hours/").json()
        self.assertEqual(data[0]["opens_at"], "08:30")
        self.assertTrue(data[1]["is_closed"])


class RegistrationTests(TestCase):
    def test_register_creates_client_with_own_customer_record(self):
        # Une fiche invitée existante au même email n'est PAS rattachée (pas de vérification d'email)
        guest = Customer.objects.create(full_name="Invité", email="awa@test.sn", phone="770000001")
        api = APIClient()
        response = api.post(
            "/api/v1/auth/register/",
            {"full_name": "Awa Diop", "email": "Awa@Test.sn", "phone": "770000001", "password": "Perfection-2026!"},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        user = User.objects.get(email="awa@test.sn")
        self.assertEqual(user.role, Role.CLIENT)
        self.assertNotEqual(user.customer.pk, guest.pk)
        self.assertEqual(api.get("/api/v1/auth/me/").json()["customer_id"], user.customer.pk)

    def test_weak_password_rejected(self):
        response = APIClient().post(
            "/api/v1/auth/register/",
            {"full_name": "A B", "email": "a@b.sn", "phone": "770000002", "password": "123"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
