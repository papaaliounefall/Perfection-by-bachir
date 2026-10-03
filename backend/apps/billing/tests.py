from rest_framework.test import APIClient

from apps.appointments.models import Appointment
from apps.appointments.tests import BaseCase
from apps.core.models import AuditLog
from apps.notifications.models import Notification


class BillingTests(BaseCase):
    def setUp(self):
        super().setUp()
        self.appointment_id = self.book(api=self.as_client(), vehicle=self.vehicle.id).data["id"]
        Appointment.objects.filter(pk=self.appointment_id).update(status=Appointment.Status.DONE)
        self.manager_api = self.as_manager()

    def invoice(self, **extra):
        return self.manager_api.post("/api/v1/invoices/", {"appointment": self.appointment_id, **extra}, format="json")

    def test_invoice_from_completed_appointment_with_sequential_number(self):
        response = self.invoice(discount=5000)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertRegex(response.data["number"], r"^INV-\d{4}-0001$")
        self.assertEqual(response.data["subtotal"], 40000)
        self.assertEqual(response.data["total"], 35000)
        self.assertEqual(response.data["status"], "pending")
        self.assertTrue(Notification.objects.filter(recipient=self.client_user, title="Facture disponible").exists())
        # Une seule facture active par rendez-vous
        self.assertEqual(self.invoice().status_code, 409)

    def test_invoice_requires_finished_service(self):
        Appointment.objects.filter(pk=self.appointment_id).update(status=Appointment.Status.CONFIRMED)
        self.assertEqual(self.invoice().status_code, 409)

    def test_payments_keep_invoice_consistent(self):
        invoice = self.invoice().data
        url = f"/api/v1/invoices/{invoice['id']}/payments/"
        partial = self.manager_api.post(url, {"amount": 15000, "method": "wave", "reference": "W-1"}, format="json")
        self.assertEqual(partial.data["status"], "partial")
        self.assertEqual(partial.data["balance"], 25000)
        too_much = self.manager_api.post(url, {"amount": 30000, "method": "cash"}, format="json")
        self.assertEqual(too_much.status_code, 400)
        paid = self.manager_api.post(url, {"amount": 25000, "method": "orange_money"}, format="json")
        self.assertEqual(paid.data["status"], "paid")
        self.assertEqual(paid.data["balance"], 0)
        self.assertTrue(AuditLog.objects.filter(action="payment.create").count() == 2)

        # Annulation impossible tant qu'il reste des paiements ; remboursement d'abord
        cancel_url = f"/api/v1/invoices/{invoice['id']}/cancel/"
        self.assertEqual(self.manager_api.post(cancel_url, {"reason": "Erreur"}, format="json").status_code, 409)
        for payment in paid.data["payments"]:
            self.manager_api.post(f"/api/v1/payments/{payment['id']}/refund/", {"reason": "Geste commercial"}, format="json")
        refunded = self.manager_api.get(f"/api/v1/invoices/{invoice['id']}/").data
        self.assertEqual(refunded["status"], "refunded")
        self.assertEqual(self.manager_api.post(cancel_url, {"reason": "Erreur"}, format="json").data["status"], "cancelled")

    def test_client_sees_own_invoice_and_pdf_only(self):
        invoice = self.invoice().data
        client = self.as_client()
        self.assertEqual(client.get("/api/v1/invoices/").data["count"], 1)
        pdf = client.get(f"/api/v1/invoices/{invoice['id']}/pdf/")
        self.assertEqual(pdf.status_code, 200)
        self.assertEqual(pdf["Content-Type"], "application/pdf")
        self.assertTrue(pdf.content.startswith(b"%PDF"))
        # Le client ne peut pas encaisser
        self.assertEqual(client.post(f"/api/v1/invoices/{invoice['id']}/payments/", {"amount": 1, "method": "cash"}, format="json").status_code, 403)

        other = APIClient()
        other.force_authenticate(self.other.user)
        self.assertEqual(other.get(f"/api/v1/invoices/{invoice['id']}/pdf/").status_code, 404)
        # Un rendez-vous d'un autre client, encore en attente : facture hors du périmètre du comptoir
        tech = APIClient()
        tech.force_authenticate(self.tech_user)
        Appointment.objects.filter(pk=self.appointment_id).update(status=Appointment.Status.CONFIRMED)
        self.assertEqual(tech.get("/api/v1/invoices/").data["count"], 0)


class CounterPaymentTests(BaseCase):
    """Le client récupère sa voiture et paie au comptoir (souvent en espèces)."""

    def setUp(self):
        super().setUp()
        self.appointment_id = self.book(api=self.as_client(), vehicle=self.vehicle.id).data["id"]
        self.url = f"/api/v1/appointments/{self.appointment_id}/"
        manager = self.as_manager()
        for action in ["confirm", "check_in", "start"]:
            manager.post(self.url + "transition/", {"action": action}, format="json")
        self.finish_steps(self.appointment_id)
        for action in ["submit_quality_check", "complete"]:
            manager.post(self.url + "transition/", {"action": action}, format="json")
        self.tech_api = APIClient()
        self.tech_api.force_authenticate(self.tech_user)

    def test_invoice_ready_when_service_validated(self):
        invoice = self.as_manager().get(self.url).data["invoice"]
        self.assertEqual(invoice["total"], 40000)
        self.assertEqual(invoice["balance"], 40000)

    def test_technician_collects_cash_but_cannot_refund(self):
        invoice_id = self.as_manager().get(self.url).data["invoice"]["id"]
        paid = self.tech_api.post(
            f"/api/v1/invoices/{invoice_id}/payments/", {"amount": 40000, "method": "cash"}, format="json"
        )
        self.assertEqual(paid.status_code, 200, paid.data)
        self.assertEqual(paid.data["status"], "paid")
        self.assertEqual(paid.data["payments"][0]["recorded_by"], "tech@test.sn")
        refund = self.tech_api.post(f"/api/v1/payments/{paid.data['payments'][0]['id']}/refund/", {"reason": "x"}, format="json")
        self.assertEqual(refund.status_code, 403)
        self.assertEqual(self.tech_api.post(f"/api/v1/invoices/{invoice_id}/cancel/", {"reason": "x"}, format="json").status_code, 403)

        report = self.as_manager().get("/api/v1/payments/cash-report/").data
        self.assertEqual(report["cash_total"], 40000)
        self.assertEqual(report["by_person"][0]["person"], "tech@test.sn")
        self.assertEqual(self.tech_api.get("/api/v1/payments/cash-report/").status_code, 403)

    def test_handover_with_unpaid_balance_is_allowed_and_traced(self):
        response = self.tech_api.post(self.url + "transition/", {"action": "deliver"}, format="json")
        self.assertEqual(response.status_code, 200)
        last = self.as_manager().get(self.url).data["history"][-1]
        self.assertIn("reste à payer de 40 000 FCFA", last["note"])

    def test_quote_service_has_no_automatic_invoice(self):
        original = Appointment.objects.get(pk=self.appointment_id)
        quote = Appointment.objects.create(
            reference="RDV-DEVIS", customer=self.customer, vehicle=self.vehicle, service=self.service,
            start_at=original.start_at, end_at=original.end_at, price_estimate=None,
            status=Appointment.Status.QUALITY_CHECK,
        )
        self.as_manager().post(f"/api/v1/appointments/{quote.id}/transition/", {"action": "complete"}, format="json")
        self.assertIsNone(self.as_manager().get(f"/api/v1/appointments/{quote.id}/").data["invoice"])
