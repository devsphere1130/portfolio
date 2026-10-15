from django.contrib import admin

from .models import ContactInquiry, InquiryNote


@admin.register(ContactInquiry)
class ContactInquiryAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'service', 'inquiry_source', 'lead_status', 'assigned_to', 'created_at']
    list_filter = ['lead_status', 'inquiry_source', 'service', 'budget', 'created_at']
    list_editable = ['lead_status']
    search_fields = ['name', 'email', 'company', 'details']
    readonly_fields = ['name', 'email', 'company', 'service', 'budget', 'details', 'ip_address', 'user_agent', 'created_at', 'updated_at']


admin.site.register(InquiryNote, list_display=['inquiry', 'author', 'created_at'], readonly_fields=['inquiry', 'author', 'body', 'created_at'])
