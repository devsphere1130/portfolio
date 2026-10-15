"""
Verified webhook processing for the WhatsApp Cloud API.

Security: the X-Hub-Signature-256 header is an HMAC-SHA256 of the exact raw request body, keyed with the app
secret. It is checked before the body is parsed, with a constant-time comparison.

Idempotency: every inbound message and every status change gets a unique WhatsAppWebhookEvent.event_key
(`msg:<wamid>` / `status:<wamid>:<status>`). A redelivered webhook hits the unique constraint and is skipped,
so it can never create a duplicate message or replay a status.

Privacy: diagnostics never include message bodies or tokens.
"""

import hashlib
import hmac
from datetime import datetime, timezone as dt_timezone

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from portfolio.models import ContactInquiry

from .models import WhatsAppConfiguration, WhatsAppConversation, WhatsAppMessage, WhatsAppWebhookEvent

SUPPORTED_STATUSES = {'sent', 'delivered', 'read', 'failed'}


def signature_is_valid(raw_body, header):
    secret = settings.WHATSAPP_APP_SECRET
    if not secret or not header or not header.startswith('sha256='):
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header.split('=', 1)[1])


def _ts(value):
    try:
        return datetime.fromtimestamp(int(value), tz=dt_timezone.utc)
    except (TypeError, ValueError, OverflowError):
        return timezone.now()


def _claim(event_key, event_type):
    """Reserve an event key. Returns the event row, or None if this event was already handled."""
    try:
        with transaction.atomic():
            return WhatsAppWebhookEvent.objects.create(event_key=event_key[:200], event_type=event_type,
                                                       state=WhatsAppWebhookEvent.State.PROCESSED)
    except IntegrityError:
        return None


def _finish(event, state, diagnostic=''):
    event.state = state
    event.diagnostic = diagnostic[:300]
    event.processed_at = timezone.now()
    event.save(update_fields=['state', 'diagnostic', 'processed_at'])


def _link_inquiry(conversation):
    """Attach the most recent website inquiry that gave this same phone number (if any)."""
    if conversation.inquiry_id:
        return
    match = ContactInquiry.objects.filter(phone_number=f'+{conversation.wa_id}').order_by('-created_at').first()
    if match:
        conversation.inquiry = match
        conversation.save(update_fields=['inquiry', 'updated_at'])


def _handle_message(message, contacts):
    event = _claim(f'msg:{message.get("id")}', 'message')
    if event is None:
        return 'duplicate'
    wa_id = str(message.get('from', ''))[:32]
    if not wa_id or not message.get('id'):
        _finish(event, WhatsAppWebhookEvent.State.IGNORED, 'Message without sender or id.')
        return 'ignored'
    profile = next((c.get('profile', {}).get('name', '') for c in contacts if c.get('wa_id') == wa_id), '')
    when = _ts(message.get('timestamp'))
    conversation, _ = WhatsAppConversation.objects.get_or_create(wa_id=wa_id)
    if profile:
        conversation.profile_name = profile[:120]
    conversation.last_inbound_at = when
    conversation.last_message_at = when
    conversation.save()
    _link_inquiry(conversation)
    kind = str(message.get('type', 'unknown'))[:24]
    text = message.get('text', {}).get('body', '') if kind == 'text' else ''
    WhatsAppMessage.objects.create(
        conversation=conversation, external_id=message['id'], direction=WhatsAppMessage.Direction.INBOUND,
        message_type=kind, text=text[:4096], status=WhatsAppMessage.Status.RECEIVED, status_updated_at=when, created_at=when,
    )
    _finish(event, WhatsAppWebhookEvent.State.PROCESSED, f'Inbound {kind} message stored.')
    return 'stored'


def _handle_status(status):
    wamid, state = status.get('id'), status.get('status')
    event = _claim(f'status:{wamid}:{state}', 'status')
    if event is None:
        return 'duplicate'
    if state not in SUPPORTED_STATUSES:
        _finish(event, WhatsAppWebhookEvent.State.IGNORED, f'Unsupported status "{str(state)[:20]}".')
        return 'ignored'
    message = WhatsAppMessage.objects.filter(external_id=wamid, direction=WhatsAppMessage.Direction.OUTBOUND).first()
    if message is None:
        _finish(event, WhatsAppWebhookEvent.State.IGNORED, 'Status for a message this site did not send.')
        return 'ignored'
    if WhatsAppMessage.RANK.get(state, 0) > WhatsAppMessage.RANK.get(message.status, 0):
        message.status = state
        message.status_updated_at = _ts(status.get('timestamp'))
        if state == 'failed':
            error = (status.get('errors') or [{}])[0]
            message.error_code = str(error.get('code', ''))[:16]
            message.error_title = str(error.get('title') or error.get('message') or 'Delivery failed')[:200]
        message.save()
    _finish(event, WhatsAppWebhookEvent.State.PROCESSED, f'Status {state} recorded.')
    return 'stored'


def process_payload(payload):
    """Apply every message and status in a verified webhook payload. Returns a summary count dict."""
    summary = {'stored': 0, 'duplicate': 0, 'ignored': 0}
    if payload.get('object') != 'whatsapp_business_account':
        return summary
    for entry in payload.get('entry') or []:
        for change in entry.get('changes') or []:
            if change.get('field') != 'messages':
                continue
            value = change.get('value') or {}
            # One transaction per item: if handling fails, the claimed event key rolls back too, so Meta's
            # retry of this webhook is processed instead of being skipped as a duplicate.
            for message in value.get('messages') or []:
                with transaction.atomic():
                    summary[_handle_message(message, value.get('contacts') or [])] += 1
            for status in value.get('statuses') or []:
                with transaction.atomic():
                    summary[_handle_status(status)] += 1
    WhatsAppConfiguration.load()  # make sure the settings row exists before stamping it
    WhatsAppConfiguration.objects.filter(pk=1).update(last_webhook_at=timezone.now())
    return summary
