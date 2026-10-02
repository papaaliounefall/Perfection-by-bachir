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
    Image.new("RGB", (300, 200), "black").save(buffer, format="JPEG")
    return SimpleUploadedFile("p.jpg", buffer.getvalue(), content_type="image/jpeg")


@override_settings(MEDIA_ROOT=MEDIA)
class GalleryTests(BaseCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def test_project_hidden_until_published(self):
        manager = self.as_manager()
        created = manager.post(
            "/api/v1/gallery/projects/",
            {"title": "Correction Classe S", "vehicle_label": "Mercedes Classe S", "category": "polishing",
             "before_image": jpeg(), "after_image": jpeg()},
            format="multipart",
        )
        self.assertEqual(created.status_code, 201, created.data)
        public = APIClient()
        self.assertEqual(public.get("/api/v1/gallery/projects/").data, [])
        self.assertEqual(public.get(created.data["after_url"]).status_code, 404)

        manager.patch(f"/api/v1/gallery/projects/{created.data['id']}/", {"is_published": True}, format="json")
        self.assertEqual(len(public.get("/api/v1/gallery/projects/").data), 1)
        self.assertEqual(public.get(created.data["after_url"]).status_code, 200)
        self.assertEqual(public.post("/api/v1/gallery/projects/", {}, format="json").status_code, 403)

    def test_testimonial_needs_consent_to_be_published(self):
        manager = self.as_manager()
        refused = manager.post(
            "/api/v1/content/testimonials/", {"author": "A", "quote": "Top", "is_published": True}, format="json"
        )
        self.assertEqual(refused.status_code, 400)
        ok = manager.post(
            "/api/v1/content/testimonials/",
            {"author": "A", "quote": "Top", "is_published": True, "consent_obtained": True},
            format="json",
        )
        self.assertEqual(ok.status_code, 201)
        public = APIClient().get("/api/v1/content/testimonials/").data
        self.assertEqual(public[0]["quote"], "Top")
        self.assertNotIn("consent_obtained", public[0])

    def test_highlights_only_when_validated(self):
        manager = self.as_manager()
        manager.post("/api/v1/content/highlights/", {"value": "500+", "label": "véhicules"}, format="json")
        self.assertEqual(APIClient().get("/api/v1/content/highlights/").data, [])
