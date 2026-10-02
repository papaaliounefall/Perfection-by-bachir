from django.utils.text import slugify
from rest_framework import serializers

from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False)

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "short_description",
            "description",
            "pricing_type",
            "price",
            "duration_minutes",
            "duration_label",
            "image_url",
            "benefits",
            "process_steps",
            "is_active",
            "sort_order",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        pricing = attrs.get("pricing_type", getattr(self.instance, "pricing_type", None))
        price = attrs.get("price", getattr(self.instance, "price", None))
        if pricing != Service.PricingType.QUOTE and price is None:
            raise serializers.ValidationError({"price": "Prix obligatoire sauf « sur devis »."})
        if not attrs.get("slug") and not self.instance:
            base = slugify(attrs["name"])
            slug, n = base, 2
            while Service.objects.filter(slug=slug).exists():
                slug, n = f"{base}-{n}", n + 1
            attrs["slug"] = slug
        return attrs
