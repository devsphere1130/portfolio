from rest_framework import serializers

from .models import ContactInquiry


class ContactInquirySerializer(serializers.ModelSerializer):
    # Honeypot: hidden from people, so only bots fill it in.
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = ContactInquiry
        fields = ['name', 'email', 'company', 'service', 'budget', 'details', 'website']
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

    def create(self, validated_data):
        validated_data.pop('website', None)
        return super().create(validated_data)
