from django.urls import path

from hello import views

urlpatterns = [
    path("", views.index, name="index"),
    path("api/hello", views.hello, name="hello"),
    path("healthz", views.healthz, name="healthz"),
]
