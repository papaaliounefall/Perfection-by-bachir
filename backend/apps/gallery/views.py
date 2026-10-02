from django.http import FileResponse, Http404
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.permissions import SAFE_METHODS, AllowAny

from apps.core.audit import record
from apps.core.permissions import IsManager, is_manager
from apps.vehicles.photos import process_upload

from .models import Highlight, Project, Testimonial


class _ImageUpload(serializers.ImageField):
    """Image publique : même traitement que les photos privées (contrôle, EXIF retiré)."""

    def to_internal_value(self, data):
        return process_upload(data)


class ProjectSerializer(serializers.ModelSerializer):
    before_image = _ImageUpload(write_only=True, required=False)
    after_image = _ImageUpload(write_only=True, required=False)
    before_url = serializers.SerializerMethodField()
    after_url = serializers.SerializerMethodField()
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "title", "vehicle_label", "category", "category_display", "description",
            "services_performed", "duration_label", "completed_on", "before_image", "after_image",
            "before_url", "after_url", "is_published", "featured", "sort_order",
        ]

    def _url(self, obj, side):
        stamp = int(obj.updated_at.timestamp()) if obj.updated_at else 0
        return f"/api/v1/gallery/projects/{obj.pk}/{side}/?v={stamp}"

    def get_before_url(self, obj):
        return self._url(obj, "before")

    def get_after_url(self, obj):
        return self._url(obj, "after")

    def validate(self, attrs):
        if self.instance is None and not (attrs.get("before_image") and attrs.get("after_image")):
            raise serializers.ValidationError("Les photos avant et après sont obligatoires.")
        return attrs


class _PublishedOrManager:
    """Public : contenus publiés uniquement. Manager : tout, et écriture."""

    model = None

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [IsManager()]

    def get_queryset(self):
        qs = self.model.objects.all()
        return qs if is_manager(self.request.user) else qs.filter(is_published=True)

    def perform_create(self, serializer):
        obj = serializer.save()
        record(self.request.user, f"{self.model._meta.model_name}.create", obj, {"is_published": [None, obj.is_published]})

    def perform_update(self, serializer):
        before = serializer.instance.is_published
        obj = serializer.save()
        if before != obj.is_published:
            record(self.request.user, f"{self.model._meta.model_name}.publish", obj, {"is_published": [before, obj.is_published]})

    def perform_destroy(self, instance):
        record(self.request.user, f"{self.model._meta.model_name}.delete", instance)
        instance.delete()


class ProjectViewSet(_PublishedOrManager, viewsets.ModelViewSet):
    model = Project
    serializer_class = ProjectSerializer
    parser_classes = [MultiPartParser, JSONParser]
    pagination_class = None

    def perform_create(self, serializer):
        serializer.validated_data["created_by"] = self.request.user
        super().perform_create(serializer)

    def perform_destroy(self, instance):
        instance.before_image.delete(save=False)
        instance.after_image.delete(save=False)
        super().perform_destroy(instance)

    def _image(self, side):
        project = self.get_object()  # 404 si non publié (sauf manager)
        image = project.before_image if side == "before" else project.after_image
        if not image:
            raise Http404
        response = FileResponse(image.open("rb"), content_type="image/jpeg")
        response["Cache-Control"] = "public, max-age=86400" if project.is_published else "private, no-store"
        return response

    @action(detail=True, methods=["get"])
    def before(self, request, pk=None):
        return self._image("before")

    @action(detail=True, methods=["get"])
    def after(self, request, pk=None):
        return self._image("after")


class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = ["id", "author", "role", "vehicle_label", "quote", "consent_obtained", "is_published", "sort_order"]

    def validate(self, attrs):
        published = attrs.get("is_published", getattr(self.instance, "is_published", False))
        consent = attrs.get("consent_obtained", getattr(self.instance, "consent_obtained", False))
        if published and not consent:
            raise serializers.ValidationError({"is_published": "Un avis ne peut être publié qu'avec l'accord du client."})
        return attrs

    def to_representation(self, obj):
        data = super().to_representation(obj)
        request = self.context.get("request")
        if not (request and is_manager(request.user)):
            data.pop("consent_obtained")
        return data


class TestimonialViewSet(_PublishedOrManager, viewsets.ModelViewSet):
    model = Testimonial
    serializer_class = TestimonialSerializer
    pagination_class = None


class HighlightSerializer(serializers.ModelSerializer):
    class Meta:
        model = Highlight
        fields = ["id", "value", "label", "is_published", "sort_order"]


class HighlightViewSet(_PublishedOrManager, viewsets.ModelViewSet):
    model = Highlight
    serializer_class = HighlightSerializer
    pagination_class = None
