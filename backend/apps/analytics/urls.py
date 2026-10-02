from django.urls import path

from . import views

urlpatterns = [
    path("analytics/summary/", views.SummaryView.as_view()),
    path("analytics/export/", views.ExportView.as_view()),
]
