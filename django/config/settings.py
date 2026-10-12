"""Django settings for the hello world blueprint.

Configuration comes from environment variables (Cloud Run style). There is no
database: the app only serves a page and a JSON endpoint.
"""

import os
from pathlib import Path

from django.core.management.utils import get_random_secret_key

BASE_DIR = Path(__file__).resolve().parent.parent

# Set DJANGO_SECRET_KEY in production. Without it a random key is generated at
# startup, which is fine here because nothing signed needs to survive a restart.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or get_random_secret_key()

# Off unless explicitly enabled.
DEBUG = os.environ.get("DJANGO_DEBUG", "").lower() in ("1", "true", "yes")

# Comma-separated hostnames. Defaults to "*" so the app answers behind the
# Platform201 gateway out of the box; set it to your domain(s) to lock it down.
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")
    if host.strip()
]

INSTALLED_APPS = ["django.contrib.staticfiles", "hello"]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "APP_DIRS": True,
    }
]

DATABASES = {}

USE_TZ = True

# Django doesn't serve static files with DEBUG off, so WhiteNoise serves them
# from STATIC_ROOT. The Dockerfile runs collectstatic to fill it at build time.
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
