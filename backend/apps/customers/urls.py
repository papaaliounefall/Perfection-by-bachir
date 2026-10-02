from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import ContactRequestView, CustomerViewSet

router = SimpleRouter()
router.register("customers", CustomerViewSet, basename="customer")

urlpatterns = [path("contact/", ContactRequestView.as_view()), *router.urls]
