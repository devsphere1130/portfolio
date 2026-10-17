from datetime import timedelta

from django.contrib.auth import logout
from django.utils import timezone

from .models import AuthSession, hash_session_key

TOUCH_INTERVAL = timedelta(minutes=5)


class AuthSessionMiddleware:
    """
    Ends any authenticated session whose AuthSession row is missing, expired or revoked,
    so "sign out everywhere" and admin-side revocation take effect on the next request.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, 'user', None)
        session_key = request.session.session_key
        if user is not None and user.is_authenticated and session_key:
            record = AuthSession.objects.filter(session_token_hash=hash_session_key(session_key)).first()
            if record is None or not record.is_valid or not user.is_active:
                logout(request)
            elif timezone.now() - record.last_seen_at > TOUCH_INTERVAL:
                AuthSession.objects.filter(pk=record.pk).update(last_seen_at=timezone.now())
        return self.get_response(request)
