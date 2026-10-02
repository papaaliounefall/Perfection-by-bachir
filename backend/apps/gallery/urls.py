from rest_framework.routers import SimpleRouter

from .views import HighlightViewSet, ProjectViewSet, TestimonialViewSet

router = SimpleRouter()
router.register("gallery/projects", ProjectViewSet, basename="project")
router.register("content/testimonials", TestimonialViewSet, basename="testimonial")
router.register("content/highlights", HighlightViewSet, basename="highlight")

urlpatterns = router.urls
