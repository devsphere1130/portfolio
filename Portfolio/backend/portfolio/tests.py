from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import ContactInquiry

VALID = {
    'name': 'Asha Patel',
    'email': 'asha@example.com',
    'company': 'Patel Studio',
    'service': 'web-app',
    'budget': 'discuss',
    'details': 'We need a booking portal for our three clinics.',
}


class ContactInquiryTests(TestCase):
    url = '/api/contact/'

    def setUp(self):
        cache.clear()  # Reset throttle counters between tests.
        self.client = APIClient()

    def test_valid_inquiry_is_saved(self):
        response = self.client.post(self.url, VALID, format='json')
        self.assertEqual(response.status_code, 201)
        inquiry = ContactInquiry.objects.get()
        self.assertEqual(inquiry.email, 'asha@example.com')
        self.assertEqual(inquiry.get_service_display(), 'Website or Web Application')

    def test_optional_fields_can_be_omitted(self):
        data = {k: v for k, v in VALID.items() if k not in ('company', 'budget')}
        response = self.client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, 201)

    def test_required_fields_and_formats_are_validated(self):
        response = self.client.post(self.url, {
            'name': ' ', 'email': 'not-an-email', 'service': 'nope', 'details': 'short',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data), {'name', 'email', 'service', 'details'})
        self.assertFalse(ContactInquiry.objects.exists())

    def test_honeypot_is_silently_discarded(self):
        response = self.client.post(self.url, {**VALID, 'website': 'http://spam.example'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertFalse(ContactInquiry.objects.exists())

    def test_requests_are_rate_limited(self):
        for _ in range(5):
            self.assertEqual(self.client.post(self.url, VALID, format='json').status_code, 201)
        self.assertEqual(self.client.post(self.url, VALID, format='json').status_code, 429)

    @override_settings(CONTACT_NOTIFY_EMAIL='owner@example.com',
                       EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_notification_email_is_sent_when_configured(self):
        self.client.post(self.url, VALID, format='json')
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Asha Patel', mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].to, ['owner@example.com'])

    @override_settings(CONTACT_NOTIFY_EMAIL='owner@example.com')
    def test_mail_failure_still_saves_inquiry(self):
        with mock.patch('portfolio.views.send_mail', side_effect=OSError('SMTP down')):
            response = self.client.post(self.url, VALID, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(ContactInquiry.objects.exists())
