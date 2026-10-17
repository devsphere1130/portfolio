import json
import logging

from django.conf import settings
from django.db.models import Count, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import IsAdminRole
from cms.audit import record
from portfolio.models import ContactInquiry

from . import cloud
from .models import WhatsAppConfiguration, WhatsAppConversation, WhatsAppMessage
from .serializers import AdminWhatsAppSerializer, PublicWhatsAppSerializer, SendMessageSerializer, WhatsAppMessageSerializer
from .webhooks import process_payload, signature_is_valid

logger = logging.getLogger(__name__)
OPEN_STATUSES = [ContactInquiry.LeadStatus.NEW, ContactInquiry.LeadStatus.AWAITING_RESPONSE]


class PublicWhatsAppView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        response = Response(PublicWhatsAppSerializer(WhatsAppConfiguration.load()).data)
        response['Cache-Control'] = 'public, max-age=60'
        return response


class AdminWhatsAppSettingsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response(AdminWhatsAppSerializer(WhatsAppConfiguration.load(), context={'request': request}).data)

    def patch(self, request):
        config = WhatsAppConfiguration.load()
        serializer = AdminWhatsAppSerializer(config, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        record(request.user, 'whatsapp.settings_updated', 'whatsapp_configuration', 1, 'Updated WhatsApp settings',
               {'fields': sorted(serializer.validated_data)}, request=request)
        return Response(serializer.data)


class AdminWhatsAppOverviewView(APIView):
    """Real counts only. Lead statuses come from inquiries; message numbers only from Cloud API records."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        config = WhatsAppConfiguration.load()
        by_status = dict(ContactInquiry.objects.values_list('lead_status').annotate(n=Count('pk')).values_list('lead_status', 'n'))
        now = timezone.now()
        recent = ContactInquiry.objects.order_by('-created_at')[:6]
        outbound = dict(WhatsAppMessage.objects.filter(direction=WhatsAppMessage.Direction.OUTBOUND)
                        .values_list('status').annotate(n=Count('pk')).values_list('status', 'n'))
        return Response({
            'inquiries': {
                'total': sum(by_status.values()),
                'by_status': {key: by_status.get(key, 0) for key in ContactInquiry.LeadStatus.values},
                'awaiting_response': sum(by_status.get(s, 0) for s in OPEN_STATUSES),
                'follow_ups_due': ContactInquiry.objects.filter(follow_up_at__lte=now).exclude(
                    lead_status__in=[ContactInquiry.LeadStatus.ARCHIVED, ContactInquiry.LeadStatus.CONVERTED]).count(),
                'with_phone': ContactInquiry.objects.exclude(phone_number='').count(),
                'by_source': dict(ContactInquiry.objects.values_list('inquiry_source').annotate(n=Count('pk')).values_list('inquiry_source', 'n')),
                'recent': [{'id': i.id, 'name': i.name, 'service': i.get_service_display(), 'lead_status': i.lead_status,
                            'source': i.inquiry_source, 'created_at': i.created_at} for i in recent],
            },
            'whatsapp': {
                'click_to_chat_ready': config.click_to_chat_ready,
                'cloud_api_ready': config.cloud_api_ready,
                'conversations': WhatsAppConversation.objects.count(),
                'inbound_messages': WhatsAppMessage.objects.filter(direction=WhatsAppMessage.Direction.INBOUND).count(),
                'outbound_by_status': {key: outbound.get(key, 0) for key in ('accepted', 'sent', 'delivered', 'read', 'failed')},
                'last_webhook_at': config.last_webhook_at,
                'last_api_success_at': config.last_api_success_at,
            },
        })


class InquiryWhatsAppView(APIView):
    """Cloud API conversation for one inquiry: GET history, POST send a text (admin action, Cloud API only)."""

    permission_classes = [IsAdminRole]
    throttle_scope = 'whatsapp_send'

    def get_throttles(self):
        return [ScopedRateThrottle()] if self.request.method == 'POST' else []

    def _conversation(self, inquiry):
        conversation = WhatsAppConversation.objects.filter(inquiry=inquiry).first()
        if conversation is None and inquiry.phone_number:
            conversation = WhatsAppConversation.objects.filter(wa_id=inquiry.phone_number.lstrip('+')).first()
        return conversation

    def get(self, request, pk):
        inquiry = get_object_or_404(ContactInquiry, pk=pk)
        conversation = self._conversation(inquiry)
        return Response({
            'cloud_api_ready': WhatsAppConfiguration.load().cloud_api_ready,
            'conversation': None if conversation is None else {
                'wa_id': conversation.wa_id, 'profile_name': conversation.profile_name,
                'service_window_open': conversation.service_window_open, 'last_inbound_at': conversation.last_inbound_at,
                'messages': WhatsAppMessageSerializer(conversation.messages.all(), many=True).data,
            },
        })

    def post(self, request, pk):
        inquiry = get_object_or_404(ContactInquiry, pk=pk)
        config = WhatsAppConfiguration.load()
        if not config.cloud_api_ready:
            return Response({'detail': 'Sending through WhatsApp requires the Cloud API to be configured. '
                                       'Use “Open WhatsApp” to send manually instead.'}, status=status.HTTP_409_CONFLICT)
        if not inquiry.phone_number:
            return Response({'detail': 'This inquiry has no phone number.'}, status=status.HTTP_400_BAD_REQUEST)
        conversation = self._conversation(inquiry)
        # Free-form text is only allowed inside WhatsApp's 24-hour customer service window (after they message you).
        if conversation is None or not conversation.service_window_open:
            return Response({'detail': 'WhatsApp only allows free-form messages within 24 hours of the customer’s last '
                                       'message to you. Ask them to message you first, or use an approved template '
                                       'from Meta’s WhatsApp Manager.'}, status=status.HTTP_409_CONFLICT)
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = WhatsAppMessage.objects.create(
            conversation=conversation, direction=WhatsAppMessage.Direction.OUTBOUND, text=serializer.validated_data['text'],
            status=WhatsAppMessage.Status.PENDING, sent_by=request.user,
        )
        try:
            wamid = cloud.send_text(config.cloud_phone_number_id, conversation.wa_id, message.text)
        except cloud.CloudAPIError as exc:
            message.status, message.error_code, message.error_title = WhatsAppMessage.Status.FAILED, exc.code, exc.title
            message.status_updated_at = timezone.now()
            message.save()
            record(request.user, 'whatsapp.send_failed', 'inquiry', inquiry.pk, f'WhatsApp send failed: {exc.title}', request=request)
            return Response({'detail': exc.title, 'message': WhatsAppMessageSerializer(message).data}, status=status.HTTP_502_BAD_GATEWAY)
        message.external_id, message.status, message.status_updated_at = wamid, WhatsAppMessage.Status.ACCEPTED, timezone.now()
        message.save()
        conversation.last_message_at = timezone.now()
        conversation.save(update_fields=['last_message_at', 'updated_at'])
        WhatsAppConfiguration.objects.filter(pk=1).update(last_api_success_at=timezone.now())
        ContactInquiry.objects.filter(pk=inquiry.pk).update(last_contacted_at=timezone.now())
        record(request.user, 'whatsapp.message_accepted', 'inquiry', inquiry.pk, f'Sent a WhatsApp message to {inquiry.name} (accepted by API)', request=request)
        return Response(WhatsAppMessageSerializer(message).data, status=status.HTTP_201_CREATED)


class WhatsAppWebhookView(APIView):
    """Meta webhook endpoint. GET = one-time verification handshake; POST = signed event delivery."""

    authentication_classes = []  # signed by Meta, not session-authenticated (so no CSRF either)
    permission_classes = [AllowAny]
    throttle_scope = 'whatsapp_webhook'
    throttle_classes = [ScopedRateThrottle]

    def get(self, request):
        token = settings.WHATSAPP_VERIFY_TOKEN
        if (token and request.query_params.get('hub.mode') == 'subscribe'
                and request.query_params.get('hub.verify_token') == token):
            return HttpResponse(request.query_params.get('hub.challenge', ''), content_type='text/plain')
        return HttpResponse('Verification failed.', status=403, content_type='text/plain')

    def post(self, request):
        raw = request.body  # exact bytes Meta signed; read before any parsing
        if not settings.WHATSAPP_APP_SECRET:
            return HttpResponse(status=503)  # Cloud API not configured on this server
        if not signature_is_valid(raw, request.headers.get('X-Hub-Signature-256', '')):
            logger.warning('Rejected WhatsApp webhook with an invalid signature.')
            return HttpResponse(status=401)
        try:
            payload = json.loads(raw)
        except ValueError:
            return HttpResponse(status=400)
        summary = process_payload(payload)  # errors propagate as 500, so Meta retries (safe: idempotent)
        logger.info('WhatsApp webhook processed: %s', summary)
        return HttpResponse(status=200)
