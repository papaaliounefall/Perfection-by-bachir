from django.urls import path

from . import views

urlpatterns = [
    path("appointments/<int:pk>/steps/<int:step_id>/", views.StepView.as_view()),
    path("appointments/<int:pk>/photos/", views.PhotoListView.as_view()),
    path("appointments/<int:pk>/photos/<int:photo_id>/", views.PhotoDetailView.as_view()),
    path("appointments/<int:pk>/photos/<int:photo_id>/file/", views.PhotoFileView.as_view()),
]
