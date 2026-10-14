from datetime import timedelta

from django.conf import settings
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from django.utils import timezone

from .models import AuthSession, hash_session_key


def client_ip(request):
    # Behind a proxy, configure it to set X-Forwarded-For; REMOTE_ADDR is the fallback.
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return (forwarded.split(',')[0].strip() or request.META.get('REMOTE_ADDR')) or None


@receiver(user_logged_in)
def record_session(sender, request, user, **kwargs):
    """Every login (dashboard or Django admin) gets a tracked, revocable session row."""
    if request is None or not request.session.session_key:
        return
    AuthSession.objects.create(
        user=user,
        session_token_hash=hash_session_key(request.session.session_key),
        ip_address=client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:300],
        expires_at=timezone.now() + timedelta(seconds=settings.SESSION_COOKIE_AGE),
    )


@receiver(user_logged_out)
def revoke_session(sender, request, user, **kwargs):
    if request is None or not request.session.session_key:
        return
    AuthSession.objects.filter(
        session_token_hash=hash_session_key(request.session.session_key), revoked_at__isnull=True
    ).update(revoked_at=timezone.now())
