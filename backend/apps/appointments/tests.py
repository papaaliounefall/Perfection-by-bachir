from datetime import datetime, time, timedelta

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.catalog.models import Service
from apps.customers.models import Customer
from apps.employees.models import Employee
from apps.vehicles.models import Vehicle

from .availability import compute_slots
from .models import Appointment, OpeningHours

WORKSHOP = {
    "CAPACITY": 1,
    "SLOT_STEP_MINUTES": 60,
    "BUFFER_MINUTES": 0,
    "MIN_NOTICE_HOURS": 0,
    "BOOKING_HORIZON_DAYS": 60,
    "CANCELLATION_MIN_HOURS": 24,
}


def next_workday(days_ahead=3):
    day = timezone.localdate() + timedelta(days=days_ahead)
    while day.weekday() == 6:
        day += timedelta(days=1)
    return day


@override_settings(WORKSHOP=WORKSHOP)
class BaseCase(TestCase):
    def setUp(self):
        cache.clear()  # remet à zéro les limites de débit (throttling) entre tests
        for weekday in range(6):
            OpeningHours.objects.create(weekday=weekday, opens_at=time(9), closes_at=time(12))
        OpeningHours.objects.create(weekday=6, is_closed=True)
        self.service = Service.objects.create(
            name="Polissage", slug="polissage", category="polishing",
            price=40000, duration_minutes=120,
        )
        self.day = next_workday()

        self.client_user = User.objects.create_user("client@test.sn", "pass-Perfection-1")
        self.customer = Customer.objects.create(
            user=self.client_user, full_name="Client Un", email="client@test.sn", phone="+221700000001"
        )
        self.vehicle = Vehicle.objects.create(
            customer=self.customer, brand="Toyota", model="Hilux", registration="DK-1-AA"
        )
        other_user = User.objects.create_user("autre@test.sn", "pass-Perfection-1")
        self.other = Customer.objects.create(
            user=other_user, full_name="Client Deux", email="autre@test.sn", phone="+221700000002"
        )
        self.manager = User.objects.create_user("manager@test.sn", "x", role=Role.MANAGER)
        self.tech_user = User.objects.create_user("tech@test.sn", "x", role=Role.TECHNICIAN)
        self.tech = Employee.objects.create(user=self.tech_user, full_name="Tech", job_title="Tech")

        self.api = APIClient()

    def book(self, hour=9, api=None, **extra):
        payload = {
            "service": self.service.id,
            "date": self.day.isoformat(),
            "time": f"{hour:02d}:00",
            **extra,
        }
        return (api or self.api).post("/api/v1/bookings/", payload, format="json")

    def finish_steps(self, appointment_id):
        from apps.workshop.models import WorkshopStep

        WorkshopStep.objects.filter(appointment_id=appointment_id).update(done_at=timezone.now())

    def as_client(self):
        api = APIClient()
        api.force_authenticate(self.client_user)
        return api

    def as_manager(self):
        api = APIClient()
        api.force_authenticate(self.manager)
        return api


class AvailabilityTests(BaseCase):
    def test_slots_follow_opening_hours_and_duration(self):
        slots = compute_slots(self.service, self.day)
        # 9h–12h, prestation de 2h, pas d'1h → 9h et 10h
        self.assertEqual([timezone.localtime(s.start).hour for s in slots], [9, 10])

    def test_closed_day_has_no_slot(self):
        sunday = self.day + timedelta(days=(6 - self.day.weekday()) % 7)
        self.assertEqual(compute_slots(self.service, sunday), [])

    def test_existing_appointment_blocks_overlapping_slots(self):
        self.assertEqual(self.book(9, api=self.as_client(), vehicle=self.vehicle.id).status_code, 201)
        slots = {timezone.localtime(s.start).hour: s.available for s in compute_slots(self.service, self.day)}
        self.assertEqual(slots, {9: False, 10: False})


class BookingTests(BaseCase):
    def test_anonymous_booking_creates_guest_customer_and_reference(self):
        response = self.book(
            contact={"full_name": "Invité", "phone": "77 000 00 03", "email": "Invite@Test.sn"},
            new_vehicle={"brand": "Kia", "model": "Sportage", "registration": "dk 99 zz"},
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertRegex(response.data["reference"], rf"^RDV-{self.day.year}\d{{4}}$")
        self.assertEqual(response.data["status"], "pending")
        guest = Customer.objects.get(email="invite@test.sn")
        self.assertIsNone(guest.user)
        self.assertEqual(guest.vehicles.get().registration, "DK-99-ZZ")

    def test_unavailable_slot_is_refused(self):
        self.assertEqual(self.book(9, api=self.as_client(), vehicle=self.vehicle.id).status_code, 201)
        response = self.book(
            10,
            contact={"full_name": "B", "phone": "770000004", "email": "b@test.sn"},
            new_vehicle={"brand": "Kia", "model": "Rio", "registration": "DK-2-BB"},
        )
        self.assertEqual(response.status_code, 409)

    def test_inactive_service_is_not_bookable(self):
        self.service.is_active = False
        self.service.save()
        response = self.book(api=self.as_client(), vehicle=self.vehicle.id)
        self.assertEqual(response.status_code, 400)

    def test_client_cannot_book_with_someone_elses_vehicle(self):
        foreign = Vehicle.objects.create(customer=self.other, brand="X", model="Y", registration="DK-3-CC")
        response = self.book(api=self.as_client(), vehicle=foreign.id)
        self.assertEqual(response.status_code, 400)

    def test_references_are_sequential(self):
        self.book(9, api=self.as_client(), vehicle=self.vehicle.id)
        self.service.duration_minutes = 60
        self.service.save()
        with override_settings(WORKSHOP={**WORKSHOP, "CAPACITY": 2}):
            self.book(10, api=self.as_client(), vehicle=self.vehicle.id)
        refs = sorted(Appointment.objects.values_list("reference", flat=True))
        self.assertEqual([r[-4:] for r in refs], ["0001", "0002"])


class WorkflowTests(BaseCase):
    def setUp(self):
        super().setUp()
        response = self.book(api=self.as_client(), vehicle=self.vehicle.id)
        self.appointment_id = response.data["id"]
        self.url = f"/api/v1/appointments/{self.appointment_id}/transition/"

    def act(self, api, action):
        return api.post(self.url, {"action": action}, format="json")

    def test_full_workflow_with_history(self):
        manager = self.as_manager()
        for action in ["confirm", "check_in", "start", "submit_quality_check", "complete", "deliver"]:
            if action == "submit_quality_check":
                self.finish_steps(self.appointment_id)
            response = self.act(manager, action)
            self.assertEqual(response.status_code, 200, (action, response.data))
        self.assertEqual(response.data["status"], "delivered")
        self.assertEqual(response.data["progress"], 100)
        self.assertEqual(len(response.data["history"]), 7)  # création + 6 actions

    def test_skipping_a_step_is_refused(self):
        response = self.act(self.as_manager(), "start")
        self.assertEqual(response.status_code, 409)

    def test_status_cannot_be_written_directly(self):
        response = self.as_manager().patch(
            f"/api/v1/appointments/{self.appointment_id}/", {"status": "done"}, format="json"
        )
        self.assertEqual(response.status_code, 405)

    def test_client_can_only_cancel(self):
        client = self.as_client()
        self.assertEqual(self.act(client, "confirm").status_code, 403)
        response = self.act(client, "cancel")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "cancelled")

    def test_technician_limited_to_assigned_work(self):
        manager = self.as_manager()
        self.act(manager, "confirm")
        self.act(manager, "check_in")
        tech = APIClient()
        tech.force_authenticate(self.tech_user)
        # Non affecté : invisible
        self.assertEqual(self.act(tech, "start").status_code, 404)
        manager.post(
            f"/api/v1/appointments/{self.appointment_id}/assign/", {"employee": self.tech.id}, format="json"
        )
        self.assertEqual(self.act(tech, "start").status_code, 200)
        self.assertEqual(self.act(tech, "confirm").status_code, 409)


class IsolationTests(BaseCase):
    def test_client_sees_only_own_data(self):
        self.book(api=self.as_client(), vehicle=self.vehicle.id)
        Vehicle.objects.create(customer=self.other, brand="X", model="Y", registration="DK-4-DD")

        other = APIClient()
        other.force_authenticate(self.other.user)
        self.assertEqual(other.get("/api/v1/appointments/").data["count"], 0)
        self.assertEqual(other.get("/api/v1/vehicles/").data["count"], 1)
        self.assertEqual(other.get("/api/v1/customers/").status_code, 403)

    def test_internal_notes_hidden_from_client(self):
        response = self.book(api=self.as_client(), vehicle=self.vehicle.id)
        self.as_manager().patch(
            f"/api/v1/appointments/{response.data['id']}/notes/",
            {"internal_notes": "secret"},
            format="json",
        )
        data = self.as_client().get(f"/api/v1/appointments/{response.data['id']}/").data
        self.assertNotIn("internal_notes", data)

    def test_client_cannot_attach_vehicle_to_another_customer(self):
        response = self.as_client().post(
            "/api/v1/vehicles/",
            {"customer": self.other.id, "brand": "A", "model": "B", "registration": "DK-5-EE"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Vehicle.objects.get(registration="DK-5-EE").customer, self.customer)


class CounterTests(BaseCase):
    """Le client dépose son véhicule et revient le chercher : accueil au comptoir."""

    def make(self, status, day=None):
        start = timezone.make_aware(
            datetime.combine(day or timezone.localdate(), time(9)), timezone.get_current_timezone()
        )
        return Appointment.objects.create(
            reference=f"RDV-T{Appointment.objects.count()}",
            customer=self.customer,
            vehicle=self.vehicle,
            service=self.service,
            start_at=start,
            end_at=start + timedelta(hours=2),
            status=status,
        )

    def tech_api(self):
        api = APIClient()
        api.force_authenticate(self.tech_user)
        return api

    def act(self, appointment, action):
        return self.tech_api().post(
            f"/api/v1/appointments/{appointment.id}/transition/", {"action": action}, format="json"
        )

    def test_any_technician_receives_todays_drop_off(self):
        appointment = self.make(Appointment.Status.CONFIRMED)  # non affecté
        response = self.act(appointment, "check_in")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], "received")

    def test_any_technician_hands_back_ready_vehicle(self):
        appointment = self.make(Appointment.Status.DONE, day=self.day)
        response = self.act(appointment, "deliver")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], "delivered")
        self.assertEqual(response.data["status_display"], "Restitué")

    def test_technician_cannot_work_on_unassigned_vehicle(self):
        appointment = self.make(Appointment.Status.CONFIRMED)
        self.act(appointment, "check_in")
        self.assertEqual(self.act(appointment, "start").status_code, 404)  # plus visible une fois reçu

    def test_future_drop_off_not_on_counter_list(self):
        self.make(Appointment.Status.CONFIRMED, day=self.day)
        self.assertEqual(self.tech_api().get("/api/v1/appointments/").data["count"], 0)
