"""Configuration Django — pilotée par variables d'environnement (voir .env.example)."""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env(name, default=None):
    return os.environ.get(name, default)


def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    return [item.strip() for item in env(name, default).split(",") if item.strip()]


DEBUG = env_bool("DJANGO_DEBUG", False)

SECRET_KEY = env("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY est obligatoire hors mode DEBUG.")
    SECRET_KEY = "dev-only-insecure-key"

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:3000")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "apps.core",
    "apps.accounts",
    "apps.customers",
    "apps.employees",
    "apps.vehicles",
    "apps.catalog",
    "apps.appointments",
    "apps.notifications",
    "apps.workshop",
    "apps.billing",
    "apps.gallery",
    "apps.analytics",
    "apps.demo",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Sert les fichiers statiques (admin) en production, sans serveur dédié
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

if env("POSTGRES_DB"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DB"),
            "USER": env("POSTGRES_USER", "perfection"),
            "PASSWORD": env("POSTGRES_PASSWORD", ""),
            "HOST": env("POSTGRES_HOST", "localhost"),
            "PORT": env("POSTGRES_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Dakar"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Fichiers envoyés (photos de véhicules). Volontairement SANS MEDIA_URL public :
# ils sont servis par l'API après contrôle d'accès. En production, remplacer par
# un stockage objet (S3 / Cloudflare R2) avec URLs signées.
MEDIA_ROOT = BASE_DIR / env("DJANGO_MEDIA_ROOT", "media")
DATA_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024

# Emails (notifications) : affichés dans la console en développement
EMAIL_BACKEND = env("DJANGO_EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env("DJANGO_EMAIL_HOST", "localhost")
EMAIL_PORT = int(env("DJANGO_EMAIL_PORT", "587"))
EMAIL_HOST_USER = env("DJANGO_EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = env("DJANGO_EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("DJANGO_EMAIL_USE_TLS", True)
DEFAULT_FROM_EMAIL = env("DJANGO_DEFAULT_FROM_EMAIL", "Perfection <no-reply@localhost>")

# Adresse publique du frontend (liens envoyés par email, ex. mot de passe oublié)
FRONTEND_URL = env("FRONTEND_URL", "http://localhost:3000").rstrip("/")
PASSWORD_RESET_TIMEOUT = 60 * 60 * 2  # lien valable 2 heures

# Identité de l'entreprise imprimée sur les factures (à valider par l'entreprise)
BUSINESS = {
    "name": env("BUSINESS_NAME", "Perfection By Bachir Ndour"),
    "address": env("BUSINESS_ADDRESS", "Dakar, Sénégal"),
    "phone": env("BUSINESS_PHONE", ""),
    "email": env("BUSINESS_EMAIL", ""),
    "ninea": env("BUSINESS_NINEA", ""),
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Erreurs serveur écrites dans la sortie standard (visibles via `docker compose logs`)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
        "apps": {"handlers": ["console"], "level": "INFO"},
    },
}

# --- Sécurité des cookies (authentification par session HttpOnly) ---
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = False  # le frontend lit le jeton pour l'en-tête X-CSRFToken
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = env_bool("DJANGO_SECURE_COOKIES", False)
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_CONTENT_TYPE_NOSNIFF = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.DefaultPagination",
    "DEFAULT_THROTTLE_RATES": {
        "login": "10/min",
        "booking": "20/hour",
        "register": "10/hour",
        "contact": "10/hour",
        "password_reset": "5/hour",
    },
}

# --- Règles de l'atelier (les horaires d'ouverture et fermetures sont en base) ---
WORKSHOP = {
    # Nombre de véhicules traités simultanément
    "CAPACITY": int(env("WORKSHOP_CAPACITY", "2")),
    # Pas entre deux créneaux proposés
    "SLOT_STEP_MINUTES": 30,
    # Marge entre deux prestations
    "BUFFER_MINUTES": 15,
    # Délai minimum avant un créneau réservable
    "MIN_NOTICE_HOURS": 2,
    # Horizon de réservation
    "BOOKING_HORIZON_DAYS": 60,
    # Délai minimum pour qu'un client annule lui-même
    "CANCELLATION_MIN_HOURS": 24,
}

# Tests : hachage rapide des mots de passe (jamais utilisé hors `manage.py test`)
import sys  # noqa: E402

if len(sys.argv) > 1 and sys.argv[1] == "test":
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
