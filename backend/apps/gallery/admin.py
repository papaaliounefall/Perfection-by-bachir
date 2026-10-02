from django.contrib import admin

from .models import Highlight, Project, Testimonial


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "completed_on", "is_published", "featured"]
    list_filter = ["is_published", "category"]
    list_editable = ["is_published", "featured"]


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ["author", "consent_obtained", "is_published"]
    list_filter = ["is_published", "consent_obtained"]


@admin.register(Highlight)
class HighlightAdmin(admin.ModelAdmin):
    list_display = ["value", "label", "is_published", "sort_order"]
    list_editable = ["is_published", "sort_order"]
