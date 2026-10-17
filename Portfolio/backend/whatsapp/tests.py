import hashlib
import hmac
import json
from datetime import timedelta
from io import StringIO
from unittest import mock

from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from accounts.tests import make_user, signed_in
from cms.models import Capability, Project, Status
from portfolio.models import ContactInquiry, InquiryNote

from . import cloud
from .models import WhatsAppConfiguration, WhatsAppConversation, WhatsAppMessage, WhatsAppWebhookEvent

SECRETS = dict(WHATSAPP_APP_SECRET='test-app-secret', WHATSAPP_ACCESS_TOKEN='EAA-super-secret-token', WHATSAPP_VERIFY_TOKEN='verify-me')
WEBHOOK = '/api/webhooks/whatsapp/'


def inquiry(**extra):
    defaults = dict(name='Asha', email='asha@example.com', service='saas', details='x' * 30)
    return ContactInquiry.objects.create(**{**defaults, **extra})


def configure(**fields):
    config = WhatsAppConfiguration.load()
    for key, value in {'enabled': True, 'business_phone': '+919876543210', **fields}.items():
        setattr(config, key, value)
    config.save()
    return config


def signed_post(client, payload, secret=SECRETS['WHATSAPP_APP_SECRET']):
    body = json.dumps(payload).encode()
    signature = 'sha256=' + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return client.post(WEBHOOK, data=body, content_type='application/json', HTTP_X_HUB_SIGNATURE_256=signature)


def envelope(value):
    return {'object': 'whatsapp_business_account', 'entry': [{'id': '1', 'changes': [{'field': 'messages', 'value': value}]}]}


def inbound(wamid='wamid.IN1', sender='919876500000', text='Hi there', ts=None):
    return envelope({'contacts': [{'wa_id': sender, 'profile': {'name': 'Ravi'}}],
                     'messages': [{'id': wamid, 'from': sender, 'timestamp': str(int(ts or timezone.now().timestamp())),
                                   'type': 'text', 'text': {'body': text}}]})


def status_event(wamid, state, errors=None):
    item = {'id': wamid, 'status': state, 'timestamp': str(int(timezone.now().timestamp())), 'recipient_id': '1'}
    if errors:
        item['errors'] = errors
    return envelope({'statuses': [item]})


class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user()
        self.editor = make_user('editor@example.com', role=User.Role.EDITOR)


class PublicConfigTests(Base):
    def test_disabled_by_default_and_exposes_no_number(self):
        data = APIClient().get('/api/public/whatsapp/').json()
        self.assertFalse(data['enabled'])
        self.assertIsNone(data['phone'])

    @override_settings(**SECRETS)
    def test_enabled_exposes_only_safe_fields(self):
        configure(mode='cloud_api', cloud_phone_number_id='111222333444', cloud_business_account_id='555666777888')
        response = APIClient().get('/api/public/whatsapp/')
        data, raw = response.json(), response.content.decode()
        self.assertEqual(data['phone'], '919876543210')       # digits for wa.me
        self.assertIsNone(data['display_phone'])               # not shown as text unless allowed
        for secret in [*SECRETS.values(), '111222333444', '555666777888']:
            self.assertNotIn(secret, raw)
        self.assertNotIn('mode', data)
        content = APIClient().get('/api/public/content/').content.decode()
        self.assertIn('"whatsapp"', content)
        for secret in SECRETS.values():
            self.assertNotIn(secret, content)

    def test_display_number_only_when_allowed(self):
        configure(show_number_publicly=True)
        self.assertEqual(APIClient().get('/api/public/whatsapp/').json()['display_phone'], '+919876543210')


class AdminSettingsTests(Base):
    URL = '/api/admin/whatsapp/settings/'

    def test_permissions(self):
        self.assertEqual(APIClient().get(self.URL).status_code, 403)
        self.assertEqual(signed_in(self.editor).get(self.URL).status_code, 403)
        self.assertEqual(signed_in(self.admin).get(self.URL).status_code, 200)

    def test_phone_is_normalised_and_validated(self):
        client = signed_in(self.admin)
        ok = client.patch(self.URL, {'business_phone': '0091 98765-43210', 'enabled': True}, format='json')
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertEqual(ok.data['business_phone'], '+919876543210')
        for bad in ['12345', '+0123456789', 'call me']:
            self.assertEqual(client.patch(self.URL, {'business_phone': bad}, format='json').status_code, 400, bad)

    def test_templates_reject_unknown_placeholders_and_html(self):
        client = signed_in(self.admin)
        self.assertEqual(client.patch(self.URL, {'project_message_template': 'About {title} from {email}'}, format='json').status_code, 400)
        self.assertEqual(client.patch(self.URL, {'default_greeting': '<b>Hi</b>'}, format='json').status_code, 400)
        self.assertEqual(client.patch(self.URL, {'project_message_template': 'About {title}: {url}'}, format='json').status_code, 200)

    def test_cannot_enable_without_number_or_cloud_without_id(self):
        client = signed_in(self.admin)
        self.assertEqual(client.patch(self.URL, {'enabled': True}, format='json').status_code, 400)
        self.assertEqual(client.patch(self.URL, {'mode': 'cloud_api'}, format='json').status_code, 400)

    @override_settings(**SECRETS)
    def test_cloud_status_reports_names_never_values(self):
        client = signed_in(self.admin)
        response = client.patch(self.URL, {'business_phone': '+919876543210', 'enabled': True, 'mode': 'cloud_api',
                                           'cloud_phone_number_id': '1234567890'}, format='json')
        self.assertTrue(response.data['cloud_status']['ready'])
        for secret in SECRETS.values():
            self.assertNotIn(secret, response.content.decode())

    def test_cloud_status_lists_missing_secrets_by_name(self):
        missing = signed_in(self.admin).get(self.URL).data['cloud_status']['missing']
        self.assertIn('WHATSAPP_ACCESS_TOKEN', missing)
        self.assertIn('WHATSAPP_APP_SECRET', missing)


class ContactFormTests(Base):
    def post(self, **extra):
        data = {'name': 'Asha Patel', 'email': 'asha@example.com', 'service': 'saas', 'details': 'We need a booking platform for clinics.', **extra}
        return APIClient().post('/api/contact/', data, format='json')

    def test_phone_optional_normalised_and_validated(self):
        self.assertEqual(self.post().status_code, 201)
        self.assertEqual(self.post(phone_number='+91 98765 43210').status_code, 201)
        self.assertEqual(ContactInquiry.objects.exclude(phone_number='').get().phone_number, '+919876543210')
        self.assertEqual(self.post(phone_number='123').status_code, 400)

    def test_related_items_must_be_published_and_set_the_source(self):
        Project.objects.create(title='Clinic Portal', slug='clinic-portal', status=Status.PUBLISHED)
        Project.objects.create(title='Secret', slug='secret-draft')
        Capability.objects.create(title='SaaS', slug='saas-products', status=Status.PUBLISHED)
        self.assertEqual(self.post(related_project='clinic-portal').status_code, 201)
        self.assertEqual(ContactInquiry.objects.latest('created_at').inquiry_source, 'project')
        self.assertEqual(self.post(related_capability='saas-products').status_code, 201)
        self.assertEqual(ContactInquiry.objects.latest('created_at').inquiry_source, 'capability')
        self.assertEqual(self.post(related_project='secret-draft').status_code, 400)
        self.assertEqual(self.post(source='whatsapp').status_code, 400)  # visitors cannot claim a WhatsApp source


class LeadManagementTests(Base):
    def test_admin_updates_lead_fields_but_not_visitor_data(self):
        lead = inquiry()
        client = signed_in(self.admin)
        follow = (timezone.now() + timedelta(days=2)).isoformat()
        response = client.patch(f'/api/admin/inquiries/{lead.pk}/', {'lead_status': 'qualified', 'assigned_to': str(self.admin.pk),
                                                                    'follow_up_at': follow, 'email': 'hacked@example.com'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        lead.refresh_from_db()
        self.assertEqual((lead.lead_status, lead.assigned_to, lead.email), ('qualified', self.admin, 'asha@example.com'))

    def test_inquiries_are_admin_only(self):
        lead = inquiry()
        for client in (APIClient(), signed_in(self.editor)):
            self.assertEqual(client.get('/api/admin/inquiries/').status_code, 403)
            self.assertEqual(client.post(f'/api/admin/inquiries/{lead.pk}/notes/', {'body': 'x'}, format='json').status_code, 403)

    def test_notes_are_private_and_plain_text(self):
        lead = inquiry()
        client = signed_in(self.admin)
        self.assertEqual(client.post(f'/api/admin/inquiries/{lead.pk}/notes/', {'body': '<script>x</script>'}, format='json').status_code, 400)
        self.assertEqual(client.post(f'/api/admin/inquiries/{lead.pk}/notes/', {'body': 'Called, wants a demo.'}, format='json').status_code, 201)
        self.assertEqual(client.get(f'/api/admin/inquiries/{lead.pk}/notes/').data[0]['body'], 'Called, wants a demo.')
        self.assertNotIn('Called, wants', APIClient().get('/api/public/content/').content.decode())

    def test_mark_contacted_and_filters(self):
        lead = inquiry()
        inquiry(name='Old', lead_status='archived')
        client = signed_in(self.admin)
        self.assertEqual(client.get('/api/admin/inquiries/?lead_status=open').data['count'], 1)
        data = client.post(f'/api/admin/inquiries/{lead.pk}/mark-contacted/').data
        self.assertEqual(data['lead_status'], 'contacted')
        self.assertIsNotNone(data['last_contacted_at'])

    def test_csv_export_is_admin_only_and_guards_formulas(self):
        inquiry(name='=HYPERLINK("http://evil")', company='+cmd')
        self.assertEqual(signed_in(self.editor).get('/api/admin/inquiries/export/').status_code, 403)
        response = signed_in(self.admin).get('/api/admin/inquiries/export/')
        self.assertEqual(response.status_code, 200)
        body = response.content.decode()
        self.assertIn("'=HYPERLINK", body)
        self.assertIn("'+cmd", body)
        self.assertNotIn(',=HYPERLINK', body)

    def test_overview_counts_are_real(self):
        inquiry()
        inquiry(lead_status='converted')
        data = signed_in(self.admin).get('/api/admin/whatsapp/overview/').data
        self.assertEqual(data['inquiries']['total'], 2)
        self.assertEqual(data['inquiries']['by_status']['converted'], 1)
        self.assertEqual(data['inquiries']['awaiting_response'], 1)
        self.assertEqual(data['whatsapp']['inbound_messages'], 0)
        self.assertEqual(sum(data['whatsapp']['outbound_by_status'].values()), 0)


@override_settings(**SECRETS)
class WebhookTests(Base):
    def test_verification_handshake(self):
        ok = APIClient().get(WEBHOOK, {'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': '12345'})
        self.assertEqual((ok.status_code, ok.content), (200, b'12345'))
        bad = APIClient().get(WEBHOOK, {'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '1'})
        self.assertEqual(bad.status_code, 403)

    @override_settings(WHATSAPP_VERIFY_TOKEN='')
    def test_verification_refused_when_not_configured(self):
        response = APIClient().get(WEBHOOK, {'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': '1'})
        self.assertEqual(response.status_code, 403)

    def test_invalid_or_missing_signature_is_rejected(self):
        client = APIClient()
        self.assertEqual(signed_post(client, inbound(), secret='wrong-secret').status_code, 401)
        self.assertEqual(client.post(WEBHOOK, data=json.dumps(inbound()), content_type='application/json').status_code, 401)
        self.assertFalse(WhatsAppMessage.objects.exists())

    def test_signature_covers_the_exact_raw_body(self):
        body = json.dumps(inbound()).encode()
        signature = 'sha256=' + hmac.new(b'test-app-secret', body, hashlib.sha256).hexdigest()
        tampered = body.replace(b'Hi there', b'Hi THERE')
        response = APIClient().post(WEBHOOK, data=tampered, content_type='application/json', HTTP_X_HUB_SIGNATURE_256=signature)
        self.assertEqual(response.status_code, 401)

    @override_settings(WHATSAPP_APP_SECRET='')
    def test_webhook_unavailable_without_app_secret(self):
        self.assertEqual(APIClient().post(WEBHOOK, data='{}', content_type='application/json').status_code, 503)

    def test_inbound_message_is_stored_once_and_linked_to_inquiry(self):
        lead = inquiry(phone_number='+919876500000')
        client = APIClient()
        self.assertEqual(signed_post(client, inbound()).status_code, 200)
        self.assertEqual(signed_post(client, inbound()).status_code, 200)  # Meta redelivers
        self.assertEqual(WhatsAppMessage.objects.count(), 1)
        conversation = WhatsAppConversation.objects.get()
        self.assertEqual((conversation.inquiry, conversation.profile_name), (lead, 'Ravi'))
        self.assertTrue(conversation.service_window_open)
        self.assertEqual(WhatsAppMessage.objects.get().text, 'Hi there')
        self.assertIsNotNone(WhatsAppConfiguration.load().last_webhook_at)

    def outbound(self, wamid='wamid.OUT1'):
        conversation = WhatsAppConversation.objects.create(wa_id='919876500000')
        return WhatsAppMessage.objects.create(conversation=conversation, external_id=wamid, direction='outbound',
                                              text='Hello', status='accepted')

    def test_status_events_follow_real_order_and_never_downgrade(self):
        message = self.outbound()
        client = APIClient()
        for state in ('delivered', 'read', 'sent', 'delivered'):  # late/duplicate events arrive out of order
            signed_post(client, status_event('wamid.OUT1', state))
        message.refresh_from_db()
        self.assertEqual(message.status, 'read')
        self.assertEqual(WhatsAppWebhookEvent.objects.filter(event_type='status').count(), 3)  # one 'delivered' was a duplicate

    def test_failed_status_records_safe_error(self):
        message = self.outbound()
        signed_post(APIClient(), status_event('wamid.OUT1', 'failed', [{'code': 131047, 'title': 'Re-engagement message'}]))
        message.refresh_from_db()
        self.assertEqual((message.status, message.error_code, message.error_title), ('failed', '131047', 'Re-engagement message'))

    def test_status_for_unknown_message_is_ignored(self):
        signed_post(APIClient(), status_event('wamid.NOT-OURS', 'delivered'))
        self.assertEqual(WhatsAppWebhookEvent.objects.get().state, 'ignored')
        self.assertFalse(WhatsAppMessage.objects.exists())


@override_settings(**SECRETS)
class SendTests(Base):
    def setUp(self):
        super().setUp()
        self.lead = inquiry(phone_number='+919876500000')
        self.url = f'/api/admin/inquiries/{self.lead.pk}/whatsapp/'
        self.client = signed_in(self.admin)

    def test_refused_when_cloud_api_not_configured(self):
        configure()  # click-to-chat only
        response = self.client.post(self.url, {'text': 'Hi'}, format='json')
        self.assertEqual(response.status_code, 409)
        self.assertFalse(WhatsAppMessage.objects.exists())

    def test_refused_outside_customer_service_window(self):
        configure(mode='cloud_api', cloud_phone_number_id='1234567890')
        WhatsAppConversation.objects.create(wa_id='919876500000', last_inbound_at=timezone.now() - timedelta(hours=25))
        self.assertEqual(self.client.post(self.url, {'text': 'Hi'}, format='json').status_code, 409)

    def window(self):
        configure(mode='cloud_api', cloud_phone_number_id='1234567890')
        WhatsAppConversation.objects.create(wa_id='919876500000', inquiry=self.lead, last_inbound_at=timezone.now())

    def test_accepted_send_is_recorded_as_accepted_not_delivered(self):
        self.window()
        with mock.patch.object(cloud, 'send_text', return_value='wamid.NEW') as send:
            response = self.client.post(self.url, {'text': 'Thanks, when can we talk?'}, format='json')
        self.assertEqual(response.status_code, 201)
        send.assert_called_once_with('1234567890', '919876500000', 'Thanks, when can we talk?')
        message = WhatsAppMessage.objects.get()
        self.assertEqual((message.status, message.external_id, message.sent_by), ('accepted', 'wamid.NEW', self.admin))
        self.lead.refresh_from_db()
        self.assertIsNotNone(self.lead.last_contacted_at)

    def test_api_or_network_failure_is_recorded_and_not_retried(self):
        self.window()
        with mock.patch.object(cloud, 'send_text', side_effect=cloud.CloudAPIError('Could not reach the WhatsApp API.')) as send:
            response = self.client.post(self.url, {'text': 'Hi'}, format='json')
        self.assertEqual(response.status_code, 502)
        self.assertEqual(send.call_count, 1)
        self.assertEqual(WhatsAppMessage.objects.get().status, 'failed')

    def test_real_http_client_reports_api_errors_safely(self):
        import urllib.error
        error = urllib.error.HTTPError('u', 400, 'Bad', {}, None)
        error.read = lambda: json.dumps({'error': {'message': 'Invalid parameter', 'code': 100}}).encode()
        with mock.patch('urllib.request.urlopen', side_effect=error):
            with self.assertRaises(cloud.CloudAPIError) as ctx:
                cloud.send_text('1234567890', '919876500000', 'Hi')
        self.assertEqual((ctx.exception.title, ctx.exception.code), ('Invalid parameter', '100'))
        self.assertNotIn('EAA-super-secret-token', str(ctx.exception))


class RetentionTests(TestCase):
    def test_old_events_are_deleted(self):
        old = WhatsAppWebhookEvent.objects.create(event_key='old', event_type='status', state='processed')
        WhatsAppWebhookEvent.objects.filter(pk=old.pk).update(received_at=timezone.now() - timedelta(days=40))
        WhatsAppWebhookEvent.objects.create(event_key='new', event_type='status', state='processed')
        call_command('whatsapp_retention', '--days', '30', stdout=StringIO())
        self.assertEqual(list(WhatsAppWebhookEvent.objects.values_list('event_key', flat=True)), ['new'])
