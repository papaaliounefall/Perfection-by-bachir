from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient

from apps.appointments.models import Appointment
from apps.appointments.tests import BaseCase


class AnalyticsTests(BaseCase):
    def test_revenue_comes_from_real_payments_only(self):
        appointment_id = self.book(api=self.as_client(), vehicle=self.vehicle.id).data["id"]
        Appointment.objects.filter(pk=appointment_id).update(status=Appointment.Status.DONE)
        manager = self.as_manager()
        invoice = manager.post("/api/v1/invoices/", {"appointment": appointment_id}, format="json").data
        paid = manager.post(f"/api/v1/invoices/{invoice['id']}/payments/", {"amount": 40000, "method": "wave"}, format="json")
        self.assertEqual(paid.status_code, 200)

        period = {"from": (timezone.localdate() - timezone.timedelta(days=30)).isoformat(),
                  "to": (timezone.localdate() + timezone.timedelta(days=30)).isoformat()}
        data = manager.get("/api/v1/analytics/summary/", period).data
        self.assertEqual(data["revenue"], 40000)
        self.assertEqual(data["revenue_by_method"][0]["method"], "Wave")
        self.assertEqual(data["popular_services"][0]["service"], "Polissage")
        self.assertEqual(data["vehicles_treated"], 1)

        refund = manager.post(f"/api/v1/payments/{paid.data['payments'][0]['id']}/refund/", {"reason": "x"}, format="json")
        self.assertEqual(refund.status_code, 200)
        self.assertEqual(manager.get("/api/v1/analytics/summary/", period).data["revenue"], 0)

    def test_csv_export_for_managers_only(self):
        self.book(api=self.as_client(), vehicle=self.vehicle.id)
        response = self.as_manager().get("/api/v1/analytics/export/", {"type": "appointments", "to": "2100-01-01"})
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")
        self.assertTrue(content.startswith("﻿Référence;Date"))
        self.assertIn("Polissage", content)
        self.assertEqual(self.as_client().get("/api/v1/analytics/summary/").status_code, 403)


class PasswordResetTests(BaseCase):
    def test_reset_flow_without_revealing_accounts(self):
        api = APIClient()
        self.assertEqual(api.post("/api/v1/auth/password/reset/", {"email": "inconnu@test.sn"}).status_code, 204)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(api.post("/api/v1/auth/password/reset/", {"email": "client@test.sn"}).status_code, 204)
        link = next(line for line in mail.outbox[0].body.splitlines() if "reset_uid=" in line)
        uid = link.split("reset_uid=")[1].split("&")[0]
        token = link.split("reset_token=")[1]

        weak = api.post("/api/v1/auth/password/reset/confirm/", {"uid": uid, "token": token, "new_password": "123"})
        self.assertEqual(weak.status_code, 400)
        ok = api.post("/api/v1/auth/password/reset/confirm/", {"uid": uid, "token": token, "new_password": "Nouveau-Perfection-26"})
        self.assertEqual(ok.status_code, 204)
        again = api.post("/api/v1/auth/password/reset/confirm/", {"uid": uid, "token": token, "new_password": "Autre-Perfection-27"})
        self.assertEqual(again.status_code, 400)  # lien à usage unique
        self.assertTrue(api.login(email="client@test.sn", password="Nouveau-Perfection-26"))
