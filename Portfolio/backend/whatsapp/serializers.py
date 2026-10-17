import re

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from cms.validation import plain_text
from portfolio.models import normalize_phone

from .models import WhatsAppConfiguration, WhatsAppMessage

# Placeholders each template may use. Anything else (e.g. {email}) is rejected so private data can't leak in.
TEMPLATE_PLACEHOLDERS = {
    'default_greeting': set(),
    'project_message_template': {'title', 'url'},
    'capability_message_template': {'title'},
    'after_form_message_template': {'name', 'service'},
    'admin_message_template': {'name', 'service'},
}


class PublicWhatsAppSerializer(serializers.ModelSerializer):
    """Exactly what the public website needs. The number is required to build wa.me links even when it is not
    displayed as text; nothing about the Cloud API (ids, tokens, status) is exposed."""

    phone = serializers.SerializerMethodField()
    display_phone = serializers.SerializerMethodField()

    class Meta:
        model = WhatsAppConfiguration
        fields = ['enabled', 'phone', 'display_phone', 'show_floating_button', 'show_contact_button', 'show_project_buttons',
                  'show_after_form_button', 'default_greeting', 'project_message_template', 'capability_message_template',
                  'after_form_message_template']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['enabled'] = instance.click_to_chat_ready
        return data

    def get_phone(self, obj):
        return obj.business_phone.lstrip('+') if obj.click_to_chat_ready else None

    def get_display_phone(self, obj):
        return obj.business_phone if obj.click_to_chat_ready and obj.show_number_publicly else None


class AdminWhatsAppSerializer(serializers.ModelSerializer):
    cloud_status = serializers.SerializerMethodField()

    class Meta:
        model = WhatsAppConfiguration
        fields = ['enabled', 'business_phone', 'show_number_publicly', 'show_floating_button', 'show_contact_button',
                  'show_project_buttons', 'show_after_form_button', 'default_greeting', 'project_message_template',
                  'capability_message_template', 'after_form_message_template', 'admin_message_template', 'mode',
                  'cloud_phone_number_id', 'cloud_business_account_id', 'last_api_success_at', 'last_webhook_at',
                  'cloud_status', 'updated_at']
        read_only_fields = ['last_api_success_at', 'last_webhook_at', 'cloud_status', 'updated_at']

    def get_cloud_status(self, obj):
        """Which pieces are present, by NAME only. Secret values are never returned."""
        missing = [name for name, value in [('WHATSAPP_ACCESS_TOKEN', settings.WHATSAPP_ACCESS_TOKEN),
                                            ('WHATSAPP_APP_SECRET', settings.WHATSAPP_APP_SECRET),
                                            ('WHATSAPP_VERIFY_TOKEN', settings.WHATSAPP_VERIFY_TOKEN)] if not value]
        if not obj.cloud_phone_number_id:
            missing.append('Phone number ID (below)')
        request = self.context.get('request')
        return {
            'ready': obj.cloud_api_ready and not missing,
            'missing': missing,
            'api_version': settings.WHATSAPP_API_VERSION,
            'webhook_url': request.build_absolute_uri('/api/webhooks/whatsapp/') if request else '/api/webhooks/whatsapp/',
        }

    def validate_business_phone(self, value):
        try:
            return normalize_phone(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages[0]) from None

    def validate(self, attrs):
        for field, allowed in TEMPLATE_PLACEHOLDERS.items():
            if field in attrs:
                text = plain_text(attrs[field], 500, field.replace('_', ' ').capitalize())
                if not text:
                    raise serializers.ValidationError({field: 'This message cannot be empty.'})
                used = set(re.findall(r'\{(\w+)\}', text))
                if used - allowed:
                    hint = ', '.join(f'{{{p}}}' for p in sorted(allowed)) or 'none'
                    raise serializers.ValidationError({field: f'Unknown placeholder(s): {", ".join(sorted(used - allowed))}. Allowed: {hint}.'})
                attrs[field] = text
        for field in ('cloud_phone_number_id', 'cloud_business_account_id'):
            if attrs.get(field) and not re.fullmatch(r'\d{5,40}', attrs[field]):
                raise serializers.ValidationError({field: 'Use the numeric ID shown in Meta’s WhatsApp Manager.'})
        merged = {**{f: getattr(self.instance, f) for f in ('enabled', 'business_phone', 'mode', 'cloud_phone_number_id')}, **attrs}
        if merged['enabled'] and not merged['business_phone']:
            raise serializers.ValidationError({'business_phone': 'Add the business number before enabling WhatsApp.'})
        if merged['mode'] == WhatsAppConfiguration.Mode.CLOUD_API and not merged['cloud_phone_number_id']:
            raise serializers.ValidationError({'cloud_phone_number_id': 'Cloud API mode needs the phone number ID from Meta.'})
        return attrs


class WhatsAppMessageSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.CharField(source='sent_by.name', read_only=True, default=None)

    class Meta:
        model = WhatsAppMessage
        fields = ['id', 'direction', 'message_type', 'text', 'status', 'status_updated_at', 'error_code', 'error_title',
                  'sent_by_name', 'created_at']


class SendMessageSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=4096)

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Write a message first.')
        return value
