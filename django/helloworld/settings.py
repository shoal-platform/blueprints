"""Django settings for the hello world blueprint.

Configuration comes from environment variables (Cloud Run style). There is no
database: the app only serves a page and a JSON endpoint.
"""

import os

from django.core.management.utils import get_random_secret_key

# Set DJANGO_SECRET_KEY in production. Without it a random key is generated at
# startup, which is fine here because nothing signed needs to survive a restart.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or get_random_secret_key()

# Off unless explicitly enabled.
DEBUG = os.environ.get("DJANGO_DEBUG", "").lower() in ("1", "true", "yes")

# Comma-separated hostnames. Defaults to "*" so the app answers behind the Shoal
# gateway out of the box; set it to your domain(s) to lock it down.
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")
    if host.strip()
]

INSTALLED_APPS = ["hello"]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "helloworld.urls"
WSGI_APPLICATION = "helloworld.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "APP_DIRS": True,
    }
]

DATABASES = {}

USE_TZ = True
