"""
Pre-deployment configuration checks: `python manage.py check --deploy`.

Hard mistakes already stop the app at startup (see settings.py: DEBUG in production, weak secret key,
"*" hosts, development-only database addresses). These checks report the rest: settings that are fine on
a developer PC or in a local rehearsal but usually wrong on a real server.
"""

from urllib.parse import urlsplit

from django.conf import settings
from django.core.checks import Error, Tags, Warning, register

LOCAL_HOSTS = {'localhost', '127.0.0.1', '::1', '[::1]'}


def _production():
    return getattr(settings, 'IS_PRODUCTION', False)


@register(Tags.security, deploy=True)
def environment_checks(app_configs, **kwargs):
    if not _production():
        return [Warning('DJANGO_ENV is not production.', hint='Set DJANGO_ENV=production on the server.', id='devsphere.W001')]
    issues = []
    if set(settings.ALLOWED_HOSTS) <= LOCAL_HOSTS:
        issues.append(Warning('DJANGO_ALLOWED_HOSTS only lists localhost.', hint='Add your domain, e.g. www.example.com.', id='devsphere.W002'))
    insecure = [o for o in settings.CSRF_TRUSTED_ORIGINS if not o.startswith('https://') and urlsplit(o).hostname not in LOCAL_HOSTS]
    if insecure:
        issues.append(Warning(f'CSRF_TRUSTED_ORIGINS has non-HTTPS origins: {", ".join(insecure)}.',
                              hint='Serve the site over HTTPS and list https:// origins.', id='devsphere.W003'))
    if not settings.SESSION_COOKIE_SECURE:
        issues.append(Warning('SESSION_COOKIE_SECURE is off, so login cookies can travel over plain HTTP.', id='devsphere.W004'))
    if settings.SESSION_COOKIE_SAMESITE == 'None' and not settings.SESSION_COOKIE_SECURE:
        issues.append(Error('SESSION_COOKIE_SAMESITE=None requires Secure cookies; browsers reject it otherwise.', id='devsphere.E001'))
    return issues


@register(Tags.database, deploy=True)
def database_checks(app_configs, **kwargs):
    if not _production():
        return []
    issues = []
    db = settings.DATABASES['default']
    if (db.get('HOST') or '') in LOCAL_HOSTS:
        issues.append(Warning(f'The database host is {db.get("HOST")}.',
                              hint='Correct only if PostgreSQL runs on this same server; otherwise use the database server host.',
                              id='devsphere.W010'))
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute('SELECT rolsuper FROM pg_roles WHERE rolname = current_user')
            row = cursor.fetchone()
        if row and row[0]:
            issues.append(Warning('The app connects to PostgreSQL as a superuser.',
                                  hint='Use a dedicated role (python manage.py provision_database, or your provider\'s app user).',
                                  id='devsphere.W011'))
    except Exception as exc:  # pragma: no cover - reported, not raised
        issues.append(Error(f'Could not connect to the database: {exc}', hint='Check DATABASE_URL.', id='devsphere.E010'))
    return issues


@register(Tags.files, deploy=True)
def media_and_email_checks(app_configs, **kwargs):
    if not _production():
        return []
    issues = []
    if settings.MEDIA_STORAGE == 'local':
        issues.append(Warning('Uploaded images are stored on this server\'s disk (MEDIA_STORAGE=local).',
                              hint='Fine with a persistent volume (compose.prod.yaml); on platforms that wipe the disk on '
                                   'redeploy use MEDIA_STORAGE=s3.', id='devsphere.W020'))
    if settings.MEDIA_STORAGE == 's3':
        options = settings.STORAGES['default'].get('OPTIONS', {})
        if 'r2.cloudflarestorage.com' in (options.get('endpoint_url') or '') and not options.get('custom_domain'):
            issues.append(Warning('Cloudflare R2 is used without MEDIA_S3_CUSTOM_DOMAIN.',
                                  hint='The R2 S3 endpoint is private, so image and video links would not load. Enable the '
                                       "bucket's public r2.dev URL or a custom domain and set MEDIA_S3_CUSTOM_DOMAIN to its host.",
                                  id='devsphere.W023'))
    if not settings.PUBLIC_SITE_URL:
        issues.append(Warning('PUBLIC_SITE_URL is not set.',
                              hint='Set it to the website origin (e.g. https://devsphere.dev) so case-study link previews '
                                   'use the right canonical URL.', id='devsphere.W022'))
    if settings.EMAIL_BACKEND.endswith(('console.EmailBackend', 'locmem.EmailBackend', 'dummy.EmailBackend')):
        issues.append(Warning('Emails are not really sent (console/locmem email backend).',
                              hint='Set the SMTP EMAIL_* values to receive contact form notifications.', id='devsphere.W021'))
    return issues
