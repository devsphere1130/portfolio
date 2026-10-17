"""Development vs production configuration: startup guards (fresh processes) and deploy checks."""

import os
import subprocess
import sys
from pathlib import Path

from django.test import SimpleTestCase, override_settings

from . import checks

BACKEND = Path(__file__).resolve().parents[1]
STRONG_KEY = 'k' * 20 + 'production-grade-secret-value-1234567890'
PROD_URL = 'postgres://app:secret@db.example.com:5432/devsphere'
PRINT_HOST = (
    "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'portfolio_api.settings'); django.setup(); "
    "from django.conf import settings as s; print('HOST=' + str(s.DATABASES['default']['HOST']))"
)


def boot(**env):
    """Import the settings in a clean process with the given environment."""
    full = {**os.environ, 'DJANGO_TESTING': 'False', **env}
    for key in ('DATABASE_HOST', 'DATABASE_PORT'):
        if key not in env:
            full.pop(key, None)
    result = subprocess.run([sys.executable, '-c', PRINT_HOST], cwd=BACKEND, env=full, capture_output=True, text=True, timeout=120)
    return result.returncode, result.stdout + result.stderr


PROD = dict(DJANGO_ENV='production', DJANGO_DEBUG='False', DJANGO_SECRET_KEY=STRONG_KEY,
            DJANGO_ALLOWED_HOSTS='www.example.com', DATABASE_URL=PROD_URL)


class StartupGuardTests(SimpleTestCase):
    def assert_refused(self, message, **env):
        code, output = boot(**env)
        self.assertNotEqual(code, 0, output)
        self.assertIn(message, output)

    def test_valid_production_config_starts(self):
        code, output = boot(**PROD)
        self.assertEqual(code, 0, output)
        self.assertIn('HOST=db.example.com', output)

    def test_debug_in_production_is_refused(self):
        self.assert_refused('DJANGO_DEBUG must be off', **{**PROD, 'DJANGO_DEBUG': 'True'})

    def test_weak_or_development_secret_is_refused(self):
        self.assert_refused('too weak for production', **{**PROD, 'DJANGO_SECRET_KEY': 'dev-only-insecure-key-do-not-use-in-production'})
        self.assert_refused('too weak for production', **{**PROD, 'DJANGO_SECRET_KEY': 'short'})

    def test_wildcard_hosts_are_refused(self):
        self.assert_refused('not "*"', **{**PROD, 'DJANGO_ALLOWED_HOSTS': '*'})

    def test_development_database_addresses_are_refused_in_production(self):
        self.assert_refused('development-only overrides', **{**PROD, 'DATABASE_HOST': 'host.docker.internal'})
        self.assert_refused('only exists on a development machine',
                            **{**PROD, 'DATABASE_URL': 'postgres://app:secret@host.docker.internal:5432/devsphere'})

    def test_unset_env_with_debug_off_is_treated_as_production(self):
        # Empty DJANGO_ENV = not set (also masks any value in a local .env file).
        self.assert_refused('too weak for production', **{**PROD, 'DJANGO_ENV': '', 'DJANGO_SECRET_KEY': 'short'})

    def test_development_allows_the_docker_host_override(self):
        code, output = boot(DJANGO_ENV='development', DJANGO_DEBUG='True', DATABASE_URL='postgres://u:p@127.0.0.1:5432/devsphere',
                            DATABASE_HOST='host.docker.internal', DATABASE_PORT='5432')
        self.assertEqual(code, 0, output)
        self.assertIn('HOST=host.docker.internal', output)


class DeployCheckTests(SimpleTestCase):
    def ids(self, *funcs):
        return {issue.id for func in funcs for issue in func(None)}

    @override_settings(IS_PRODUCTION=False)
    def test_development_is_flagged_by_check_deploy(self):
        self.assertEqual(self.ids(checks.environment_checks), {'devsphere.W001'})

    @override_settings(IS_PRODUCTION=True, ALLOWED_HOSTS=['localhost'], CSRF_TRUSTED_ORIGINS=['http://www.example.com'],
                       SESSION_COOKIE_SECURE=False, SESSION_COOKIE_SAMESITE='None', MEDIA_STORAGE='local',
                       EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend', PUBLIC_SITE_URL='')
    def test_risky_production_settings_are_reported(self):
        found = self.ids(checks.environment_checks, checks.media_and_email_checks)
        self.assertEqual(found, {'devsphere.W002', 'devsphere.W003', 'devsphere.W004', 'devsphere.E001',
                                 'devsphere.W020', 'devsphere.W021', 'devsphere.W022'})

    @override_settings(IS_PRODUCTION=True, MEDIA_STORAGE='s3', STORAGES={'default': {'OPTIONS': {
        'endpoint_url': 'https://abc123.r2.cloudflarestorage.com', 'custom_domain': None}}})
    def test_r2_without_a_public_domain_is_reported(self):
        self.assertIn('devsphere.W023', self.ids(checks.media_and_email_checks))

    @override_settings(IS_PRODUCTION=True, ALLOWED_HOSTS=['www.example.com'], CSRF_TRUSTED_ORIGINS=['https://www.example.com'],
                       SESSION_COOKIE_SECURE=True, SESSION_COOKIE_SAMESITE='Lax', MEDIA_STORAGE='s3',
                       EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend', PUBLIC_SITE_URL='https://www.example.com')
    def test_good_production_settings_pass(self):
        self.assertEqual(self.ids(checks.environment_checks, checks.media_and_email_checks), set())
