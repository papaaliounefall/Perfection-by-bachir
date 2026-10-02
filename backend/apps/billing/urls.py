from rest_framework.routers import SimpleRouter

from .views import InvoiceViewSet, PaymentViewSet

router = SimpleRouter()
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("payments", PaymentViewSet, basename="payment")

urlpatterns = router.urls
