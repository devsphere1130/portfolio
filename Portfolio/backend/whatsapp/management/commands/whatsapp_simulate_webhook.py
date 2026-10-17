"""
Send a correctly signed sample webhook to YOUR OWN endpoint, to test the Cloud API pipeline without Meta and
without messaging any real person. Development only.

    python manage.py whatsapp_simulate_webhook --kind message --from 919876543210 --text "Hello"
    python manage.py whatsapp_simulate_webhook --kind status --wamid wamid.XYZ --status delivered
"""

import hashlib
import hmac
import json
import time
import urllib.request
import uuid

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Post a signed sample WhatsApp webhook (message or status) to a local endpoint. Development only.'

    def add_arguments(self, parser):
        parser.add_argument('--url', default='http://127.0.0.1:8000/api/webhooks/whatsapp/')
        parser.add_argument('--kind', choices=['message', 'status'], default='message')
        parser.add_argument('--from', dest='sender', default='15550000001', help='Sender wa_id (digits).')
        parser.add_argument('--name', default='Test Contact')
        parser.add_argument('--text', default='Hello from the webhook simulator.')
        parser.add_argument('--wamid', default='', help='Message id for --kind status (an outbound message you sent).')
        parser.add_argument('--status', choices=['sent', 'delivered', 'read', 'failed'], default='delivered')

    def handle(self, *args, **opts):
        if getattr(settings, 'IS_PRODUCTION', False):
            raise CommandError('Refusing to simulate webhooks in production.')
        if not settings.WHATSAPP_APP_SECRET:
            raise CommandError('Set WHATSAPP_APP_SECRET (any test value) in backend/.env first.')
        now = str(int(time.time()))
        if opts['kind'] == 'message':
            value = {'messaging_product': 'whatsapp',
                     'contacts': [{'wa_id': opts['sender'], 'profile': {'name': opts['name']}}],
                     'messages': [{'id': f'wamid.SIM{uuid.uuid4().hex}', 'from': opts['sender'], 'timestamp': now,
                                   'type': 'text', 'text': {'body': opts['text']}}]}
        else:
            if not opts['wamid']:
                raise CommandError('--wamid is required for --kind status.')
            value = {'messaging_product': 'whatsapp',
                     'statuses': [{'id': opts['wamid'], 'status': opts['status'], 'timestamp': now, 'recipient_id': opts['sender']}]}
        body = json.dumps({'object': 'whatsapp_business_account',
                           'entry': [{'id': 'SIMULATED', 'changes': [{'field': 'messages', 'value': value}]}]}).encode()
        signature = 'sha256=' + hmac.new(settings.WHATSAPP_APP_SECRET.encode(), body, hashlib.sha256).hexdigest()
        request = urllib.request.Request(opts['url'], data=body, method='POST',
                                         headers={'Content-Type': 'application/json', 'X-Hub-Signature-256': signature})
        with urllib.request.urlopen(request, timeout=10) as response:
            self.stdout.write(self.style.SUCCESS(f'Webhook accepted: HTTP {response.status}'))
