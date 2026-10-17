from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from whatsapp.models import WhatsAppWebhookEvent


class Command(BaseCommand):
    help = 'Delete processed webhook event records older than N days (default WHATSAPP_EVENT_RETENTION_DAYS). Run daily.'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=settings.WHATSAPP_EVENT_RETENTION_DAYS)

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=options['days'])
        deleted, _ = WhatsAppWebhookEvent.objects.filter(received_at__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted} webhook event record(s) older than {options["days"]} days.'))
