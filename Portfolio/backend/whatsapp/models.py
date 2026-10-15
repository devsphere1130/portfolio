"""
WhatsApp integration data.

- WhatsAppConfiguration: non-secret settings for click-to-chat and the optional Cloud API. Access tokens and
  app secrets are NEVER stored here; they live in environment variables (see settings.WHATSAPP_*).
- WhatsAppConversation / WhatsAppMessage / WhatsAppWebhookEvent: written ONLY by the official WhatsApp
  Business Platform Cloud API integration (outbound sends and verified webhooks). With click-to-chat alone
  they stay empty: opening wa.me is not a message we can see.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

DEFAULT_GREETING = 'Hi Devsphere, I visited your portfolio and would like to discuss a software development project.'
DEFAULT_PROJECT_TEMPLATE = 'Hi Devsphere, I saw your project "{title}" on your portfolio. {url} I would like to know more about it.'
DEFAULT_CAPABILITY_TEMPLATE = 'Hi Devsphere, I would like to discuss {title} for my business. Could you share more details?'
DEFAULT_AFTER_FORM_TEMPLATE = 'Hi Devsphere, I just sent a project inquiry through your website ({service}). My name is {name}.'
DEFAULT_ADMIN_TEMPLATE = 'Hi {name}, this is Devsphere following up on your {service} inquiry from our website.'


class WhatsAppConfiguration(models.Model):
    class Mode(models.TextChoices):
        CLICK_TO_CHAT = 'click_to_chat', 'Click-to-chat only'
        CLOUD_API = 'cloud_api', 'Click-to-chat + WhatsApp Cloud API'

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    enabled = models.BooleanField(default=False, help_text='Master switch for every WhatsApp feature on the website.')
    business_phone = models.CharField(max_length=16, blank=True, help_text='International format, e.g. +919876543210.')
    show_number_publicly = models.BooleanField(default=False)
    show_floating_button = models.BooleanField(default=True)
    show_contact_button = models.BooleanField(default=True)
    show_project_buttons = models.BooleanField(default=True)
    show_after_form_button = models.BooleanField(default=True)
    default_greeting = models.CharField(max_length=500, default=DEFAULT_GREETING)
    project_message_template = models.CharField(max_length=500, default=DEFAULT_PROJECT_TEMPLATE)
    capability_message_template = models.CharField(max_length=500, default=DEFAULT_CAPABILITY_TEMPLATE)
    after_form_message_template = models.CharField(max_length=500, default=DEFAULT_AFTER_FORM_TEMPLATE)
    admin_message_template = models.CharField(max_length=500, default=DEFAULT_ADMIN_TEMPLATE)
    mode = models.CharField(max_length=16, choices=Mode.choices, default=Mode.CLICK_TO_CHAT)
    # Cloud API identifiers are not secret (they appear in Meta's dashboard); the access token is.
    cloud_phone_number_id = models.CharField(max_length=40, blank=True)
    cloud_business_account_id = models.CharField(max_length=40, blank=True)
    last_api_success_at = models.DateTimeField(null=True, blank=True)
    last_webhook_at = models.DateTimeField(null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'whatsapp_configuration'
        constraints = [models.CheckConstraint(condition=models.Q(id=1), name='whatsapp_configuration_singleton')]

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    @property
    def click_to_chat_ready(self):
        return self.enabled and bool(self.business_phone)

    @property
    def cloud_api_ready(self):
        """True only when the mode is on AND every secret/identifier is present."""
        return (self.mode == self.Mode.CLOUD_API and bool(self.cloud_phone_number_id)
                and bool(settings.WHATSAPP_ACCESS_TOKEN) and bool(settings.WHATSAPP_APP_SECRET))


class WhatsAppConversation(models.Model):
    """One WhatsApp contact (wa_id) seen through the Cloud API."""

    wa_id = models.CharField(max_length=32, unique=True, help_text="Contact's WhatsApp ID as reported by the API.")
    profile_name = models.CharField(max_length=120, blank=True)
    inquiry = models.ForeignKey('portfolio.ContactInquiry', on_delete=models.SET_NULL, null=True, blank=True, related_name='whatsapp_conversations')
    last_inbound_at = models.DateTimeField(null=True, blank=True, help_text='Opens the 24-hour customer service window.')
    last_message_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'whatsapp_conversations'
        ordering = ['-last_message_at']

    def __str__(self):
        return self.profile_name or self.wa_id

    @property
    def service_window_open(self):
        return bool(self.last_inbound_at and timezone.now() - self.last_inbound_at < timezone.timedelta(hours=24))


class WhatsAppMessage(models.Model):
    class Direction(models.TextChoices):
        INBOUND = 'inbound', 'Inbound'
        OUTBOUND = 'outbound', 'Outbound'

    class Status(models.TextChoices):
        # Each value is only ever set from a real API response or a verified status webhook.
        PENDING = 'pending', 'Pending (not yet accepted by WhatsApp)'
        ACCEPTED = 'accepted', 'Accepted by the API'
        SENT = 'sent', 'Sent'
        DELIVERED = 'delivered', 'Delivered'
        READ = 'read', 'Read'
        FAILED = 'failed', 'Failed'
        RECEIVED = 'received', 'Received'

    # Ordering of outbound states, so a late "sent" webhook can never downgrade "read".
    RANK = {'pending': 0, 'accepted': 1, 'sent': 2, 'delivered': 3, 'read': 4, 'failed': 5}

    conversation = models.ForeignKey(WhatsAppConversation, on_delete=models.CASCADE, related_name='messages')
    external_id = models.CharField(max_length=128, unique=True, null=True, blank=True, help_text='wamid from the API.')
    direction = models.CharField(max_length=8, choices=Direction.choices)
    message_type = models.CharField(max_length=24, default='text')
    text = models.TextField(blank=True, max_length=4096)
    status = models.CharField(max_length=10, choices=Status.choices)
    status_updated_at = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=16, blank=True)
    error_title = models.CharField(max_length=200, blank=True)
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = 'whatsapp_messages'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.direction} {self.message_type} ({self.status})'


class WhatsAppWebhookEvent(models.Model):
    """One processed webhook item. `event_key` is unique, so a redelivered event is never applied twice."""

    class State(models.TextChoices):
        PROCESSED = 'processed', 'Processed'
        IGNORED = 'ignored', 'Ignored'
        FAILED = 'failed', 'Failed'

    event_key = models.CharField(max_length=200, unique=True)
    event_type = models.CharField(max_length=24)
    state = models.CharField(max_length=10, choices=State.choices)
    diagnostic = models.CharField(max_length=300, blank=True, help_text='Safe summary; no tokens or message bodies.')
    received_at = models.DateTimeField(auto_now_add=True, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'whatsapp_webhook_events'
        ordering = ['-received_at']
