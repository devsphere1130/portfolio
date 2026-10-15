import re

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


def normalize_phone(value):
    """International format: '+' then 8-15 digits (E.164). Accepts spaces, dashes, brackets and a 00 prefix."""
    if not value:
        return ''
    raw = re.sub(r'[\s().-]', '', str(value))
    if raw.startswith('00'):
        raw = '+' + raw[2:]
    if not raw.startswith('+'):
        raw = '+' + raw
    if not re.fullmatch(r'\+[1-9]\d{7,14}', raw):
        raise ValidationError('Use the international format with country code, e.g. +91 98765 43210.')
    return raw


class ContactInquiry(models.Model):
    """Project inquiry submitted from the website's Contact page. Private: admin-only API access."""

    class LeadStatus(models.TextChoices):
        # Lead-management states set by an admin. They are NOT proof that any WhatsApp message was sent.
        NEW = 'new', 'New'
        AWAITING_RESPONSE = 'awaiting_response', 'Awaiting response'
        CONTACTED = 'contacted', 'Contacted'
        QUALIFIED = 'qualified', 'Qualified'
        CONVERTED = 'converted', 'Converted'
        NOT_QUALIFIED = 'not_qualified', 'Not qualified'
        ARCHIVED = 'archived', 'Archived'

    class Source(models.TextChoices):
        CONTACT_FORM = 'contact_form', 'Contact form'
        PROJECT = 'project', 'Project page'
        CAPABILITY = 'capability', 'Capability / service'
        WHATSAPP = 'whatsapp', 'WhatsApp (Cloud API message)'
        OTHER = 'other', 'Other'

    SERVICE_CHOICES = [
        ('web-app', 'Website or Web Application'),
        ('saas', 'SaaS Product'),
        ('business-software', 'Business Software'),
        ('frontend', 'Frontend Development'),
        ('backend-api', 'Backend or API Development'),
        ('automation', 'Automation'),
        ('modernization', 'System Modernization'),
        ('ui-ux', 'UI/UX Design'),
        ('qa', 'Testing and Quality Assurance'),
        ('other', 'Something Else'),
    ]
    BUDGET_CHOICES = [
        ('undecided', 'Not decided yet'),
        ('under-500', 'Under $500'),
        ('500-1500', '$500\u2013$1,500'),
        ('1500-5000', '$1,500\u2013$5,000'),
        ('5000-plus', '$5,000+'),
        ('discuss', "Let's discuss"),
    ]

    name = models.CharField(max_length=120)
    email = models.EmailField()
    company = models.CharField(max_length=160, blank=True)
    service = models.CharField(max_length=32, choices=SERVICE_CHOICES)
    budget = models.CharField(max_length=32, choices=BUDGET_CHOICES, blank=True)
    details = models.TextField(max_length=5000)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=300, blank=True)
    phone_number = models.CharField(max_length=16, blank=True, help_text='Optional, international format.')
    inquiry_source = models.CharField(max_length=20, choices=Source.choices, default=Source.CONTACT_FORM, db_index=True)
    related_project = models.ForeignKey('cms.Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='inquiries')
    related_capability = models.ForeignKey('cms.Capability', on_delete=models.SET_NULL, null=True, blank=True, related_name='inquiries')
    lead_status = models.CharField(max_length=20, choices=LeadStatus.choices, default=LeadStatus.NEW, db_index=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_inquiries')
    last_contacted_at = models.DateTimeField(null=True, blank=True)
    follow_up_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'contact_messages'
        ordering = ['-created_at']
        verbose_name_plural = "Contact inquiries"

    def __str__(self):
        return f"{self.name} \u2014 {self.get_service_display()}"


class InquiryNote(models.Model):
    """Internal, admin-only note on an inquiry. Never exposed through public APIs."""

    inquiry = models.ForeignKey(ContactInquiry, on_delete=models.CASCADE, related_name='notes')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    body = models.TextField(max_length=4000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inquiry_notes'
        ordering = ['-created_at']

    def __str__(self):
        return f'Note on {self.inquiry_id}'
