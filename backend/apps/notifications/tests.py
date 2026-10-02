from django.core import mail
from rest_framework.test import APIClient

from apps.appointments.tests import BaseCase

from .models import Notification


class NotificationTests(BaseCase):
    def test_client_notified_at_each_customer_facing_step(self):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.book(api=self.as_client(), vehicle=self.vehicle.id)
        appointment_id = response.data["id"]
        manager = self.as_manager()
        for action in ["confirm", "check_in", "start", "submit_quality_check", "complete"]:
            if action == "submit_quality_check":
                self.finish_steps(appointment_id)
            with self.captureOnCommitCallbacks(execute=True):
                manager.post(f"/api/v1/appointments/{appointment_id}/transition/", {"action": action}, format="json")

        titles = list(
            Notification.objects.filter(recipient=self.client_user).order_by("id").values_list("title", flat=True)
        )
        # Le contrôle qualité interne n'est pas notifié
        self.assertEqual(
            titles,
            [
                "Demande de rendez-vous enregistrée",
                "Rendez-vous confirmé",
                "Véhicule reçu",
                "Prestation commencée",
                "Votre véhicule est prêt",
            ],
        )
        self.assertEqual(len(mail.outbox), 5)
        self.assertEqual(mail.outbox[-1].to, ["client@test.sn"])

    def test_guest_gets_email_only(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.book(
                contact={"full_name": "Invité", "phone": "770000009", "email": "guest@test.sn"},
                new_vehicle={"brand": "Kia", "model": "Rio", "registration": "DK-9"},
            )
        # Pas de compte donc pas de notification in-app pour l'invité (l'atelier, lui, est prévenu)
        self.assertFalse(Notification.objects.filter(recipient__role="client").exists())
        self.assertEqual(mail.outbox[0].to, ["guest@test.sn"])

    def test_notifications_are_private_and_can_be_read(self):
        self.book(api=self.as_client(), vehicle=self.vehicle.id)
        client = self.as_client()
        self.assertEqual(client.get("/api/v1/notifications/unread-count/").data["count"], 1)
        other = APIClient()
        other.force_authenticate(self.other.user)
        self.assertEqual(other.get("/api/v1/notifications/").data["count"], 0)
        notification_id = client.get("/api/v1/notifications/").data["results"][0]["id"]
        self.assertEqual(other.post(f"/api/v1/notifications/{notification_id}/read/").status_code, 404)
        client.post("/api/v1/notifications/read-all/")
        self.assertEqual(client.get("/api/v1/notifications/unread-count/").data["count"], 0)


class StaffNotificationTests(BaseCase):
    def titles(self, user):
        return list(Notification.objects.filter(recipient=user).order_by("id").values_list("title", flat=True))

    def test_staff_notified_of_what_needs_their_action(self):
        appointment_id = self.book(api=self.as_client(), vehicle=self.vehicle.id).data["id"]
        url = f"/api/v1/appointments/{appointment_id}/"
        manager = self.as_manager()
        manager.post(url + "assign/", {"employee": self.tech.id}, format="json")
        for action in ["confirm", "check_in"]:
            manager.post(url + "transition/", {"action": action}, format="json")
        tech = APIClient()
        tech.force_authenticate(self.tech_user)
        tech.post(url + "transition/", {"action": "start"}, format="json")
        self.finish_steps(appointment_id)
        tech.post(url + "transition/", {"action": "submit_quality_check"}, format="json")

        self.assertEqual(self.titles(self.tech_user), ["Nouvelle prestation affectée", "Véhicule déposé"])
        # Le manager n'est pas notifié de ses propres actions, seulement de ce qui l'attend
        self.assertEqual(self.titles(self.manager), ["Nouvelle demande de réservation", "Contrôle final à valider"])

    def test_cancellation_by_client_alerts_managers_only_when_client_did_it(self):
        client = self.as_client()
        first = self.book(api=client, vehicle=self.vehicle.id).data["id"]
        client.post(f"/api/v1/appointments/{first}/transition/", {"action": "cancel"}, format="json")
        self.assertIn("Rendez-vous annulé par le client", self.titles(self.manager))

        second = self.book(api=client, vehicle=self.vehicle.id).data["id"]
        before = len(self.titles(self.manager))
        self.as_manager().post(f"/api/v1/appointments/{second}/transition/", {"action": "cancel"}, format="json")
        self.assertEqual(len(self.titles(self.manager)), before)
