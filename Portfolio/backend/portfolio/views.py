import logging

from django.conf import settings
from django.core.mail import send_mail
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import ContactInquirySerializer

logger = logging.getLogger(__name__)


class ContactInquiryView(APIView):
    """
    POST a project inquiry from the Contact page.
    Saves it (visible in Django admin) and, if CONTACT_NOTIFY_EMAIL is set, emails a notification.
    """
    authentication_classes = []  # Public form: no session, so no CSRF token needed.
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'contact'

    def post(self, request):
        serializer = ContactInquirySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Honeypot filled in: answer like a success so bots learn nothing, but store nothing.
        if serializer.validated_data.get('website'):
            return Response({'ok': True}, status=status.HTTP_201_CREATED)

        inquiry = serializer.save(
            ip_address=request.META.get('REMOTE_ADDR') or None,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:300],
        )
        self._notify(inquiry)
        return Response({'ok': True, 'id': inquiry.id}, status=status.HTTP_201_CREATED)

    @staticmethod
    def _notify(inquiry):
        recipient = settings.CONTACT_NOTIFY_EMAIL
        if not recipient:
            return
        body = (
            f"Name: {inquiry.name}\n"
            f"Email: {inquiry.email}\n"
            f"Company: {inquiry.company or '-'}\n"
            f"Needs: {inquiry.get_service_display()}\n"
            f"Budget: {inquiry.get_budget_display() or '-'}\n\n"
            f"{inquiry.details}\n"
        )
        try:
            send_mail(
                subject=f"New project inquiry: {inquiry.name}",
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
            )
        except Exception:
            # The inquiry is already saved; a mail outage must not lose it or fail the request.
            logger.exception("Could not send notification email for inquiry %s", inquiry.id)


            