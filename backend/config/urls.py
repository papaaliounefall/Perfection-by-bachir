from django.contrib import admin
from django.urls import include, path

api_v1 = [
    path("auth/", include("apps.accounts.urls")),
    path("", include("apps.customers.urls")),
    path("", include("apps.employees.urls")),
    path("", include("apps.vehicles.urls")),
    path("", include("apps.catalog.urls")),
    path("", include("apps.workshop.urls")),
    path("", include("apps.appointments.urls")),
    path("", include("apps.notifications.urls")),
    path("", include("apps.billing.urls")),
    path("", include("apps.gallery.urls")),
    path("", include("apps.analytics.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
]
