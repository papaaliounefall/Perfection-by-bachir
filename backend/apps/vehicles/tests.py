import io
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.customers.models import Customer

from .models import Vehicle

MEDIA = tempfile.mkdtemp()


def jpeg(size=(3000, 2000)):
    buffer = io.BytesIO()
    Image.new("RGB", size, "red").save(buffer, format="JPEG")
    return SimpleUploadedFile("voiture.jpg", buffer.getvalue(), content_type="image/jpeg")


@override_settings(MEDIA_ROOT=MEDIA)
class VehiclePhotoTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        self.owner = User.objects.create_user("owner@test.sn", "x")
        customer = Customer.objects.create(user=self.owner, full_name="A", email="owner@test.sn", phone="770000001")
        self.vehicle = Vehicle.objects.create(customer=customer, brand="Kia", model="Rio", registration="DK-1")
        self.api = APIClient()
        self.api.force_authenticate(self.owner)
        self.url = f"/api/v1/vehicles/{self.vehicle.id}/photo/"

    def test_upload_resizes_and_serves_privately(self):
        response = self.api.post(self.url, {"photo": jpeg()}, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["photo_url"].startswith(self.url))
        self.vehicle.refresh_from_db()
        with Image.open(self.vehicle.photo.path) as img:
            self.assertLessEqual(max(img.size), 1600)
        served = self.api.get(self.url)
        self.assertEqual(served.status_code, 200)
        self.assertEqual(served["Content-Type"], "image/jpeg")

        stranger = User.objects.create_user("x@test.sn", "x")
        Customer.objects.create(user=stranger, full_name="B", email="x@test.sn", phone="770000002")
        other = APIClient()
        other.force_authenticate(stranger)
        self.assertEqual(other.get(self.url).status_code, 404)
        self.assertEqual(APIClient().get(self.url).status_code, 403)

    def test_fake_image_rejected_and_old_photo_kept(self):
        self.api.post(self.url, {"photo": jpeg((200, 100))}, format="multipart")
        self.vehicle.refresh_from_db()
        previous = self.vehicle.photo.name
        fake = SimpleUploadedFile("virus.jpg", b"<?php echo 1; ?>", content_type="image/jpeg")
        response = self.api.post(self.url, {"photo": fake}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.photo.name, previous)

    def test_photo_can_be_removed(self):
        self.api.post(self.url, {"photo": jpeg((200, 100))}, format="multipart")
        response = self.api.delete(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["photo_url"], "")
