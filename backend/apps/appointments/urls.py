from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("appointments", views.AppointmentViewSet, basename="appointment")

urlpatterns = [
    path("bookings/", views.BookingView.as_view()),
    path("availability/", views.AvailabilityView.as_view()),
    path("availability/days/", views.AvailabilityDaysView.as_view()),
    path("dashboard/summary/", views.DashboardSummaryView.as_view()),
    path("opening-hours/", views.OpeningHoursView.as_view()),
    *router.urls,
]
