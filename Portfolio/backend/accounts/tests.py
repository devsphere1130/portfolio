from datetime import timedelta
from io import StringIO

from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from cms.models import AuditLog

from .models import AuthSession, User

PASSWORD = 'Correct-Horse-Battery-42'


def make_user(email='admin@example.com', role=User.Role.ADMIN, **extra):
    return User.objects.create_user(email=email, name=email.split('@')[0], password=PASSWORD, role=role, **extra)


def signed_in(user):
    client = APIClient()
    response = client.post('/api/auth/login/', {'email': user.email, 'password': PASSWORD}, format='json')
    assert response.status_code == 200, response.content
    return client


class LoginTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = make_user()

    def test_login_sets_httponly_session_and_records_hashed_session(self):
        client = APIClient()
        response = client.post('/api/auth/login/', {'email': 'ADMIN@example.com ', 'password': PASSWORD}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['email'], 'admin@example.com')
        cookie = response.cookies['devsphere_session']
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['samesite'], 'Lax')
        session = AuthSession.objects.get(user=self.user)
        self.assertNotEqual(session.session_token_hash, cookie.value)  # only the hash is stored
        self.assertEqual(len(session.session_token_hash), 64)
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.last_login)
        self.assertEqual(client.get('/api/auth/me/').data['user']['email'], 'admin@example.com')

    def test_wrong_password_unknown_email_and_inactive_get_the_same_error(self):
        inactive = make_user('off@example.com', is_active=False)
        for email, password in [('admin@example.com', 'nope'), ('ghost@example.com', PASSWORD), (inactive.email, PASSWORD)]:
            response = APIClient().post('/api/auth/login/', {'email': email, 'password': password}, format='json')
            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.data['detail'], 'Incorrect email or password.')
        self.assertEqual(AuditLog.objects.filter(action='auth.login_failed').count(), 3)
        self.assertFalse(any('password' in str(log.metadata).lower() for log in AuditLog.objects.all()))

    def test_login_requires_csrf_token(self):
        client = APIClient(enforce_csrf_checks=True)
        response = client.post('/api/auth/login/', {'email': self.user.email, 'password': PASSWORD}, format='json')
        self.assertEqual(response.status_code, 403)
        token = client.get('/api/auth/csrf/').data['csrfToken']
        response = client.post('/api/auth/login/', {'email': self.user.email, 'password': PASSWORD}, format='json',
                               HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200)

    def test_writes_require_csrf_once_signed_in(self):
        client = APIClient(enforce_csrf_checks=True)
        token = client.get('/api/auth/csrf/').data['csrfToken']
        token = client.post('/api/auth/login/', {'email': self.user.email, 'password': PASSWORD}, format='json',
                            HTTP_X_CSRFTOKEN=token).data['csrfToken']
        self.assertEqual(client.post('/api/admin/services/', {'title': 'X', 'slug': 'x'}, format='json').status_code, 403)
        self.assertEqual(client.post('/api/admin/services/', {'title': 'X', 'slug': 'x'}, format='json',
                                     HTTP_X_CSRFTOKEN=token).status_code, 201)

    def test_brute_force_is_throttled_per_account_even_across_ips(self):
        # Default limit: 5 attempts per account per minute (LOGIN_THROTTLE_EMAIL_RATE).
        codes = [APIClient(REMOTE_ADDR=f'10.0.0.{i}').post(
            '/api/auth/login/', {'email': self.user.email, 'password': 'bad'}, format='json').status_code for i in range(7)]
        self.assertEqual(codes[:5], [400] * 5)
        self.assertEqual(codes[5:], [429, 429])
        # The right password is refused too while throttled.
        locked = APIClient(REMOTE_ADDR='10.0.0.99').post('/api/auth/login/', {'email': self.user.email, 'password': PASSWORD}, format='json')
        self.assertEqual(locked.status_code, 429)

    def test_logout_revokes_session(self):
        client = signed_in(self.user)
        self.assertEqual(client.post('/api/auth/logout/').status_code, 204)
        self.assertIsNone(client.get('/api/auth/me/').data['user'])
        self.assertIsNotNone(AuthSession.objects.get(user=self.user).revoked_at)

    def test_revoked_or_expired_session_is_signed_out_on_next_request(self):
        client = signed_in(self.user)
        AuthSession.objects.update(revoked_at=timezone.now())
        self.assertEqual(client.get('/api/admin/dashboard/').status_code, 403)
        self.assertIsNone(client.get('/api/auth/me/').data['user'])

        client = signed_in(self.user)
        AuthSession.objects.filter(revoked_at__isnull=True).update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(client.get('/api/admin/dashboard/').status_code, 403)

    def test_change_password_keeps_this_session_and_signs_out_others(self):
        here, elsewhere = signed_in(self.user), signed_in(self.user)
        response = here.post('/api/auth/change-password/', {'current_password': PASSWORD, 'new_password': 'An0ther-Strong-Passphrase'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(here.get('/api/admin/dashboard/').status_code, 200)
        self.assertEqual(elsewhere.get('/api/admin/dashboard/').status_code, 403)
        weak = here.post('/api/auth/change-password/', {'current_password': 'An0ther-Strong-Passphrase', 'new_password': '12345'}, format='json')
        self.assertEqual(weak.status_code, 400)


class RoleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user()
        self.editor = make_user('editor@example.com', role=User.Role.EDITOR)

    def test_no_public_registration(self):
        response = APIClient().post('/api/admin/users/', {'email': 'x@example.com', 'name': 'x', 'role': 'admin', 'password': PASSWORD}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_editor_cannot_manage_users_or_raise_own_role(self):
        client = signed_in(self.editor)
        self.assertEqual(client.get('/api/admin/users/').status_code, 403)
        self.assertEqual(client.patch(f'/api/admin/users/{self.editor.pk}/', {'role': 'admin'}, format='json').status_code, 403)
        self.editor.refresh_from_db()
        self.assertEqual(self.editor.role, 'editor')

    def test_admin_creates_user_with_strong_password_only(self):
        client = signed_in(self.admin)
        weak = client.post('/api/admin/users/', {'email': 'n@example.com', 'name': 'N', 'role': 'editor', 'password': 'short'}, format='json')
        self.assertEqual(weak.status_code, 400)
        ok = client.post('/api/admin/users/', {'email': 'N@Example.com', 'name': 'N', 'role': 'editor', 'password': PASSWORD}, format='json')
        self.assertEqual(ok.status_code, 201)
        self.assertNotIn('password', ok.data)
        self.assertTrue(User.objects.get(email='n@example.com').password.startswith(('md5$', 'argon2')))

    def test_last_admin_cannot_be_demoted_or_deactivated(self):
        client = signed_in(self.admin)
        self.assertEqual(client.patch(f'/api/admin/users/{self.admin.pk}/', {'role': 'editor'}, format='json').status_code, 400)
        self.assertEqual(client.patch(f'/api/admin/users/{self.admin.pk}/', {'is_active': False}, format='json').status_code, 400)

    def test_deactivating_a_user_ends_their_sessions(self):
        editor_client = signed_in(self.editor)
        signed_in(self.admin).patch(f'/api/admin/users/{self.editor.pk}/', {'is_active': False}, format='json')
        self.assertEqual(editor_client.get('/api/admin/dashboard/').status_code, 403)


class BootstrapAdminTests(TestCase):
    def run_cmd(self, **env):
        out = StringIO()
        with _env(env):
            call_command('bootstrap_admin', '--no-input', stdout=out)
        return out.getvalue()

    def test_creates_once_and_is_idempotent(self):
        output = self.run_cmd(INITIAL_ADMIN_EMAIL='Owner@Example.com', INITIAL_ADMIN_NAME='Owner', INITIAL_ADMIN_PASSWORD=PASSWORD)
        self.assertIn('Created admin owner@example.com', output)
        user = User.objects.get()
        self.assertTrue(user.is_admin and user.check_password(PASSWORD))
        again = self.run_cmd(INITIAL_ADMIN_EMAIL='other@example.com', INITIAL_ADMIN_PASSWORD='Different-Strong-Pass-1')
        self.assertIn('already exists', again)
        self.assertEqual(User.objects.count(), 1)
        self.assertTrue(User.objects.get().check_password(PASSWORD))  # never overwritten

    def test_rejects_weak_password(self):
        with self.assertRaises(CommandError):
            self.run_cmd(INITIAL_ADMIN_EMAIL='owner@example.com', INITIAL_ADMIN_PASSWORD='password123')
        self.assertFalse(User.objects.exists())


class _env:
    """Temporarily set process environment variables (python-decouple reads os.environ first)."""

    def __init__(self, values):
        self.values = values

    def __enter__(self):
        import os
        self.old = {k: os.environ.get(k) for k in self.values}
        os.environ.update(self.values)

    def __exit__(self, *exc):
        import os
        for key, value in self.old.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
