from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import ContactInquiry, normalize_phone

PUBLIC_SOURCES = [ContactInquiry.Source.CONTACT_FORM, ContactInquiry.Source.PROJECT, ContactInquiry.Source.CAPABILITY]


class ContactInquirySerializer(serializers.ModelSerializer):
    # Honeypot: hidden from people, so only bots fill it in.
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=24)
    source = serializers.ChoiceField(choices=PUBLIC_SOURCES, required=False, write_only=True)
    # Public slugs only; only published items can be referenced, so drafts can't be probed through this form.
    related_project = serializers.SlugField(required=False, allow_blank=True, write_only=True)
    related_capability = serializers.SlugField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = ContactInquiry
        fields = ['name', 'email', 'company', 'phone_number', 'service', 'budget', 'details', 'website', 'source',
                  'related_project', 'related_capability']
        extra_kwargs = {
            'name': {'error_messages': {'required': 'Please enter your name.', 'blank': 'Please enter your name.'}},
            'email': {'error_messages': {'required': 'Please enter your email.', 'blank': 'Please enter your email.', 'invalid': 'Please enter a valid email address.'}},
            'service': {'error_messages': {'required': 'Please choose what you need.', 'invalid_choice': 'Please choose what you need.', 'blank': 'Please choose what you need.'}},
            'details': {'error_messages': {'required': 'Please tell us a little about your project.', 'blank': 'Please tell us a little about your project.'}},
        }

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Please enter your name.')
        return value

    def validate_details(self, value):
        value = value.strip()
        if len(value) < 20:
            raise serializers.ValidationError('Please add a little more detail (at least 20 characters).')
        return value

    def validate_company(self, value):
        return value.strip()

    def validate_phone_number(self, value):
        try:
            return normalize_phone(value.strip())
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages[0]) from None

    def _published(self, model, slug, field):
        if not slug:
            return None
        obj = model.objects.filter(slug=slug, status='published').first()
        if obj is None:
            raise serializers.ValidationError({field: 'Unknown item.'})
        return obj

    def validate(self, attrs):
        from cms.models import Capability, Project

        attrs['related_project'] = self._published(Project, attrs.get('related_project'), 'related_project')
        attrs['related_capability'] = self._published(Capability, attrs.get('related_capability'), 'related_capability')
        source = attrs.pop('source', None)
        if source is None:
            source = (ContactInquiry.Source.PROJECT if attrs['related_project']
                      else ContactInquiry.Source.CAPABILITY if attrs['related_capability'] else ContactInquiry.Source.CONTACT_FORM)
        attrs['inquiry_source'] = source
        return attrs

    def create(self, validated_data):
        validated_data.pop('website', None)
        return super().create(validated_data)
