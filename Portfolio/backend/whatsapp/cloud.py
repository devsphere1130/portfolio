"""
Minimal client for the official WhatsApp Business Platform Cloud API (Graph API `/{phone-number-id}/messages`).

Only text messages are sent, and only by an admin action. A successful HTTP response means WhatsApp
*accepted* the request, not that it was sent, delivered or read; those states arrive later as verified
status webhooks (see webhooks.py).

Sends are deliberately NOT retried automatically: a retried send can reach the customer twice. Network
failures are reported to the admin, who can decide to try again.
"""

import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)


class CloudAPIError(Exception):
    """Safe-to-display error: never contains the access token or the request body."""

    def __init__(self, title, code='', status=None):
        super().__init__(title)
        self.title = title[:200]
        self.code = str(code)[:16]
        self.status = status


def messages_url(phone_number_id):
    base = settings.WHATSAPP_GRAPH_BASE_URL.rstrip('/')
    return f'{base}/{settings.WHATSAPP_API_VERSION}/{phone_number_id}/messages'


def send_text(phone_number_id, to_digits, body):
    """Send a plain text message. Returns the WhatsApp message id (wamid) on acceptance."""
    payload = {
        'messaging_product': 'whatsapp',
        'recipient_type': 'individual',
        'to': to_digits,
        'type': 'text',
        'text': {'preview_url': False, 'body': body},
    }
    request = urllib.request.Request(
        messages_url(phone_number_id),
        data=json.dumps(payload).encode(),
        method='POST',
        headers={'Authorization': f'Bearer {settings.WHATSAPP_ACCESS_TOKEN}', 'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(request, timeout=settings.WHATSAPP_HTTP_TIMEOUT) as response:
            data = json.loads(response.read() or b'{}')
    except urllib.error.HTTPError as exc:
        try:
            error = json.loads(exc.read() or b'{}').get('error', {})
        except ValueError:
            error = {}
        title = error.get('error_user_msg') or error.get('message') or f'WhatsApp API returned HTTP {exc.code}'
        logger.warning('WhatsApp send rejected: HTTP %s code=%s', exc.code, error.get('code'))
        raise CloudAPIError(title, error.get('code', ''), exc.code) from None
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        logger.warning('WhatsApp API unreachable: %s', exc.__class__.__name__)
        raise CloudAPIError('Could not reach the WhatsApp API (network error or timeout). Nothing was sent.') from None

    messages = data.get('messages') or []
    if not messages or not messages[0].get('id'):
        raise CloudAPIError('The WhatsApp API response did not include a message id.')
    return messages[0]['id']
