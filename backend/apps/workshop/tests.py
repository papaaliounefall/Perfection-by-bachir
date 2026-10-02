import io
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APIClient

from apps.appointments.tests import BaseCase

MEDIA = tempfile.mkdtemp()


def jpeg():
    buffer = io.BytesIO()
    Image.new("RGB", (400, 300), "white").save(buffer, format="JPEG")
    return SimpleUploadedFile("p.jpg", buffer.getvalue(), content_type="image/jpeg")


@override_settings(MEDIA_ROOT=MEDIA)
class WorkshopTests(BaseCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        super().setUp()
        self.service.process_steps = [{"step": "01", "title": "Lavage"}, {"step": "02", "title": "Polissage"}]
        self.service.save()
        self.appointment_id = self.book(api=self.as_client(), vehicle=self.vehicle.id).data["id"]
        self.url = f"/api/v1/appointments/{self.appointment_id}/"
        self.manager = self.as_manager()
        self.manager.post(self.url + "assign/", {"employee": self.tech.id}, format="json")
        for action in ["confirm", "check_in"]:
            self.manager.post(self.url + "transition/", {"action": action}, format="json")
        self.tech_api = APIClient()
        self.tech_api.force_authenticate(self.tech_user)

    def steps(self):
        return self.manager.get(self.url).data["steps"]

    def test_steps_created_from_service_protocol_at_check_in(self):
        self.assertEqual([s["title"] for s in self.steps()], ["Lavage", "Polissage"])

    def test_progress_follows_validated_steps_and_blocks_quality_check(self):
        self.tech_api.post(self.url + "transition/", {"action": "start"}, format="json")
        first, second = self.steps()
        self.assertEqual(self.manager.get(self.url).data["progress"], 50)

        blocked = self.tech_api.post(self.url + "transition/", {"action": "submit_quality_check"}, format="json")
        self.assertEqual(blocked.status_code, 409)

        r1 = self.tech_api.post(self.url + f"steps/{first['id']}/", {"done": True}, format="json")
        self.assertEqual(r1.data["progress"], 58)  # 50 % + moitié du palier suivant
        self.tech_api.post(self.url + f"steps/{second['id']}/", {"done": True}, format="json")
        ok = self.tech_api.post(self.url + "transition/", {"action": "submit_quality_check"}, format="json")
        self.assertEqual(ok.status_code, 200)

    def test_steps_only_during_treatment_and_by_assigned_staff(self):
        step = self.steps()[0]
        self.assertEqual(self.tech_api.post(self.url + f"steps/{step['id']}/", {"done": True}, format="json").status_code, 409)
        self.tech_api.post(self.url + "transition/", {"action": "start"}, format="json")
        client = self.as_client()
        self.assertEqual(client.post(self.url + f"steps/{step['id']}/", {"done": True}, format="json").status_code, 403)

    def test_photos_uploaded_by_staff_visible_to_owner_only(self):
        created = self.tech_api.post(
            self.url + "photos/", {"photo": jpeg(), "kind": "inspection", "caption": "Rayure aile"}, format="multipart"
        )
        self.assertEqual(created.status_code, 201, created.data)

        client = self.as_client()
        photos = client.get(self.url + "photos/").data
        self.assertEqual(photos[0]["kind_display"], "Inspection à la réception")
        self.assertEqual(client.get(photos[0]["url"]).status_code, 200)
        # Le client ne peut pas ajouter de photo d'intervention
        self.assertEqual(client.post(self.url + "photos/", {"photo": jpeg(), "kind": "after"}, format="multipart").status_code, 403)

        other = APIClient()
        other.force_authenticate(self.other.user)
        self.assertEqual(other.get(self.url + "photos/").status_code, 404)
