"""
Django settings for the DevSphere API.

Everything environment-specific comes from environment variables (or a local `.env` file read by
python-decouple). See `.env.example` for the full list. Production refuses to start when required
values are missing instead of silently falling back to insecure defaults.
"""

import sys
import tempfile
from datetime import timedelta
from pathlib import Path

import dj_database_url
from decouple import Csv, config
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env(name, legacy=None, **kwargs):
    """Read DJANGO_* settings, still honouring the older unprefixed names in existing .env files."""
    if legacy:
        kwargs.setdefault('default', config(legacy, default=kwargs.get('default')))
    return config(name, **kwargs)


DEBUG = env('DJANGO_DEBUG', legacy='DEBUG', default=False, cast=bool)

# development | production. Unset: production whenever DEBUG is off, so a forgotten value fails safe.
DJANGO_ENV = (env('DJANGO_ENV', default='').strip().lower() or ('development' if DEBUG else 'production'))
if DJANGO_ENV not in ('development', 'production'):
    raise ImproperlyConfigured("DJANGO_ENV must be 'development' or 'production'.")
IS_PRODUCTION = DJANGO_ENV == 'production'
if IS_PRODUCTION and DEBUG:
    raise ImproperlyConfigured('DJANGO_DEBUG must be off when DJANGO_ENV=production.')

TESTING = env('DJANGO_TESTING', default=False, cast=bool) or (len(sys.argv) > 1 and sys.argv[1] == 'test')

SECRET_KEY = env('DJANGO_SECRET_KEY', legacy='SECRET_KEY', default='')
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured('DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is off.')
    SECRET_KEY = 'dev-only-insecure-key-do-not-use-in-production'
if IS_PRODUCTION and (len(SECRET_KEY) < 40 or SECRET_KEY.startswith(('dev-', 'django-insecure', 'change-me'))):
    raise ImproperlyConfigured('DJANGO_SECRET_KEY is too weak for production: use 40+ random characters '
                               '(python -c "import secrets; print(secrets.token_urlsafe(50))").')

ALLOWED_HOSTS = env('DJANGO_ALLOWED_HOSTS', legacy='ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())
if IS_PRODUCTION and '*' in ALLOWED_HOSTS:
    raise ImproperlyConfigured('DJANGO_ALLOWED_HOSTS must list your real domain(s) in production, not "*".')


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'accounts',
    'cms',
    'portfolio',
    'whatsapp',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # serves /static/ (Django admin assets) in production
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'accounts.middleware.AuthSessionMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'portfolio_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'portfolio_api.wsgi.application'


# ---------------------------------------------------------------------------
# Database — PostgreSQL only (no silent SQLite fallback)
# ---------------------------------------------------------------------------

DATABASE_URL = env('DATABASE_URL', default='')
if not DATABASE_URL:
    raise ImproperlyConfigured(
        'DATABASE_URL is not set. Example: postgres://devsphere:password@localhost:5433/devsphere '
        '(see docs/SETUP.md).'
    )
DATABASES = {
    'default': dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=env('DATABASE_CONN_MAX_AGE', default=60, cast=int),
        conn_health_checks=True,
    )
}
# Transaction-pooling poolers (Neon's "-pooler" host, PgBouncer) can't keep server-side cursors open.
DATABASES['default']['DISABLE_SERVER_SIDE_CURSORS'] = env('DATABASE_DISABLE_SERVER_SIDE_CURSORS', default=False, cast=bool)
# Containers reach the same database by a different address (127.0.0.1 inside a container is the container).
# DATABASE_HOST / DATABASE_PORT swap just the address, so the credentials stay in one place: DATABASE_URL.
# Development only: production must state its real database address in DATABASE_URL itself.
DEV_ONLY_DB_HOSTS = {'host.docker.internal'}
_db_override = env('DATABASE_HOST', default=''), env('DATABASE_PORT', default='')
if IS_PRODUCTION:
    if any(_db_override):
        raise ImproperlyConfigured('DATABASE_HOST / DATABASE_PORT are development-only overrides; '
                                   'put the production database address in DATABASE_URL.')
    if DATABASES['default'].get('HOST') in DEV_ONLY_DB_HOSTS:
        raise ImproperlyConfigured(f"DATABASE_URL points at {DATABASES['default']['HOST']}, which only exists on a "
                                   'development machine. Use the production database host.')
else:
    if _db_override[0]:
        DATABASES['default']['HOST'] = _db_override[0]
    if _db_override[1]:
        DATABASES['default']['PORT'] = _db_override[1]
if not DATABASES['default']['ENGINE'].endswith('postgresql'):
    raise ImproperlyConfigured('DATABASE_URL must point to PostgreSQL (postgres://...).')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ---------------------------------------------------------------------------
# Authentication & sessions
# ---------------------------------------------------------------------------

AUTH_USER_MODEL = 'accounts.User'

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
]
if TESTING:
    # Fast hashing keeps the test suite quick; never used outside tests.
    PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = int(timedelta(hours=env('SESSION_HOURS', default=8, cast=int)).total_seconds())
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_NAME = 'devsphere_session'
SESSION_SAVE_EVERY_REQUEST = False
# Cross-site (e.g. Vercel frontend + separate API domain) needs SameSite=None, which requires Secure.
SESSION_COOKIE_SAMESITE = env('SESSION_COOKIE_SAMESITE', default='Lax')
SESSION_COOKIE_SECURE = env('SESSION_COOKIE_SECURE', default=not DEBUG, cast=bool)
CSRF_COOKIE_SAMESITE = SESSION_COOKIE_SAMESITE
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
CSRF_COOKIE_HTTPONLY = False  # the SPA receives the token from /api/auth/csrf/ instead of reading it
# Dev defaults cover `npm run dev` (5173) and `npm run preview` (4173). Production must set real origins.
CSRF_TRUSTED_ORIGINS = env('CSRF_TRUSTED_ORIGINS', default='http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173', cast=Csv())


# ---------------------------------------------------------------------------
# CORS (only needed when the frontend is served from another origin)
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env('FRONTEND_ORIGINS', default='http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173', cast=Csv())
CORS_ALLOW_CREDENTIALS = True


# ---------------------------------------------------------------------------
# Production hardening
# ---------------------------------------------------------------------------

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = env('SECURE_SSL_REDIRECT', default=False, cast=bool)
SECURE_REDIRECT_EXEMPT = [r'^api/health/$']  # platform health checks call over plain HTTP inside the network
SECURE_HSTS_SECONDS = env('SECURE_HSTS_SECONDS', default=0, cast=int)
# Opt-in: both commit every subdomain to HTTPS-only (preload is very hard to undo).
SECURE_HSTS_INCLUDE_SUBDOMAINS = env('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False, cast=bool)
SECURE_HSTS_PRELOAD = env('SECURE_HSTS_PRELOAD', default=False, cast=bool)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
X_FRAME_OPTIONS = 'DENY'


# ---------------------------------------------------------------------------
# Cache — database-backed so rate limits are shared by every worker process
# ---------------------------------------------------------------------------

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'django_cache',
    }
}
if TESTING:
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}


# ---------------------------------------------------------------------------
# Static & media files
# ---------------------------------------------------------------------------

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = env('MEDIA_URL', default='/media/')
MEDIA_ROOT = Path(env('MEDIA_ROOT', default=str(BASE_DIR / 'media')))
if TESTING:
    # Tests upload real files; keep them out of the real media folder.
    MEDIA_ROOT = Path(tempfile.gettempdir()) / 'devsphere-test-media'
MEDIA_STORAGE = env('MEDIA_STORAGE', default='local')  # local | s3
MEDIA_MAX_UPLOAD_MB = env('MEDIA_MAX_UPLOAD_MB', default=8, cast=int)
DATA_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024

STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}
if MEDIA_STORAGE == 's3':
    # Any S3-compatible service (AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO, ...).
    from botocore.config import Config as BotoConfig

    STORAGES['default'] = {
        'BACKEND': 'storages.backends.s3.S3Storage',
        'OPTIONS': {
            'bucket_name': env('MEDIA_S3_BUCKET'),
            'region_name': env('MEDIA_S3_REGION', default=None),
            'endpoint_url': env('MEDIA_S3_ENDPOINT_URL', default=None),
            'access_key': env('MEDIA_S3_ACCESS_KEY_ID'),
            'secret_key': env('MEDIA_S3_SECRET_ACCESS_KEY'),
            'custom_domain': env('MEDIA_S3_CUSTOM_DOMAIN', default=None),
            'default_acl': None,
            'querystring_auth': False,  # public portfolio images; bucket policy controls access
            'file_overwrite': False,
            'object_parameters': {'CacheControl': 'public, max-age=31536000, immutable'},
            # Only send checksums when an operation requires them: newer boto3 defaults add checksum
            # headers that not every S3-compatible service (or presigned URL flow) accepts.
            'client_config': BotoConfig(request_checksum_calculation='when_required', response_checksum_validation='when_required'),
        },
    }
elif MEDIA_STORAGE != 'local':
    raise ImproperlyConfigured("MEDIA_STORAGE must be 'local' or 's3'.")

# Project videos (see docs/CASE_STUDIES.md). Files go to the same storage as images, never the database.
# With MEDIA_STORAGE=s3 the browser uploads straight to the bucket using a short-lived signed form;
# with local storage the file is posted to Django (keep it modest and match nginx client_max_body_size).
VIDEO_MAX_UPLOAD_MB = env('VIDEO_MAX_UPLOAD_MB', default=300, cast=int)
VIDEO_MAX_DURATION_SECONDS = env('VIDEO_MAX_DURATION_SECONDS', default=1800, cast=int)
VIDEO_MAX_WIDTH = env('VIDEO_MAX_WIDTH', default=3840, cast=int)
VIDEO_MAX_HEIGHT = env('VIDEO_MAX_HEIGHT', default=2160, cast=int)
VIDEO_DIRECT_UPLOAD_EXPIRY_SECONDS = env('VIDEO_DIRECT_UPLOAD_EXPIRY_SECONDS', default=900, cast=int)
VIDEO_EXTERNAL_PROVIDERS = env('VIDEO_EXTERNAL_PROVIDERS', default='youtube,vimeo')  # '' disables links
# Public origin of the website, used for canonical URLs and social previews (e.g. https://devsphere.dev).
PUBLIC_SITE_URL = env('PUBLIC_SITE_URL', default='').rstrip('/')


# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.SessionAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_PAGINATION_CLASS': 'cms.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'EXCEPTION_HANDLER': 'cms.exceptions.api_exception_handler',
    'DEFAULT_THROTTLE_RATES': {
        'contact': env('CONTACT_THROTTLE_RATE', default='5/hour'),
        'login_ip': env('LOGIN_THROTTLE_IP_RATE', default='10/min'),
        'login_email': env('LOGIN_THROTTLE_EMAIL_RATE', default='5/min'),
        'upload': env('UPLOAD_THROTTLE_RATE', default='60/hour'),
        'whatsapp_send': env('WHATSAPP_SEND_THROTTLE_RATE', default='60/hour'),
        'whatsapp_webhook': env('WHATSAPP_WEBHOOK_THROTTLE_RATE', default='1200/min'),
    },
}
if DEBUG:
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'].append('rest_framework.renderers.BrowsableAPIRenderer')


# ---------------------------------------------------------------------------
# Email (contact form notifications)
# ---------------------------------------------------------------------------

# Inquiries are always saved; set CONTACT_NOTIFY_EMAIL plus SMTP values to also get an email.
CONTACT_NOTIFY_EMAIL = env('CONTACT_NOTIFY_EMAIL', default='')
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='localhost')
EMAIL_PORT = env('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = env('EMAIL_USE_TLS', default=True, cast=bool)
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='webmaster@localhost')
# Give up on a slow or blocked mail server quickly; the inquiry is already saved either way.
EMAIL_TIMEOUT = env('EMAIL_TIMEOUT', default=10, cast=int)
# Alternative to SMTP: an HTTPS endpoint that sends the email (e.g. Google Apps Script with your Gmail).
# When set, it is used instead of SMTP. The secret must match the one in the script.
CONTACT_NOTIFY_WEBHOOK_URL = env('CONTACT_NOTIFY_WEBHOOK_URL', default='')
CONTACT_NOTIFY_WEBHOOK_SECRET = env('CONTACT_NOTIFY_WEBHOOK_SECRET', default='')
if CONTACT_NOTIFY_WEBHOOK_URL and not CONTACT_NOTIFY_WEBHOOK_URL.startswith('https://'):
    raise ImproperlyConfigured('CONTACT_NOTIFY_WEBHOOK_URL must be an https:// URL.')


# ---------------------------------------------------------------------------
# WhatsApp Business Platform (optional; click-to-chat needs none of this)
# ---------------------------------------------------------------------------
# Secrets live only here (environment / host secret manager): never in the database, the images or React.
WHATSAPP_ACCESS_TOKEN = env('WHATSAPP_ACCESS_TOKEN', default='')        # system-user token from Meta
WHATSAPP_APP_SECRET = env('WHATSAPP_APP_SECRET', default='')            # signs webhook payloads (X-Hub-Signature-256)
WHATSAPP_VERIFY_TOKEN = env('WHATSAPP_VERIFY_TOKEN', default='')        # your own random string for webhook setup
WHATSAPP_API_VERSION = env('WHATSAPP_API_VERSION', default='v23.0')
WHATSAPP_GRAPH_BASE_URL = env('WHATSAPP_GRAPH_BASE_URL', default='https://graph.facebook.com')
WHATSAPP_HTTP_TIMEOUT = env('WHATSAPP_HTTP_TIMEOUT', default=10, cast=int)
WHATSAPP_EVENT_RETENTION_DAYS = env('WHATSAPP_EVENT_RETENTION_DAYS', default=30, cast=int)


# ---------------------------------------------------------------------------
# Logging — everything to stdout/stderr so containers and platforms collect it
# ---------------------------------------------------------------------------

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {'plain': {'format': '%(asctime)s %(levelname)s %(name)s: %(message)s'}},
    'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'plain'}},
    'root': {'handlers': ['console'], 'level': env('LOG_LEVEL', default='INFO')},
    'loggers': {
        'django.db.backends': {'level': 'WARNING'},
        # Tests deliberately trigger 4xx responses and a simulated mail outage; keep their output readable.
        'django.request': {'level': 'CRITICAL' if TESTING else 'WARNING'},
        'portfolio.views': {'level': 'CRITICAL' if TESTING else 'INFO'},
    },
}

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
