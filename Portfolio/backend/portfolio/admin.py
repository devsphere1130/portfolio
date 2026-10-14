from django.contrib import admin

from .models import ContactInquiry


@admin.register(ContactInquiry)
class ContactInquiryAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'service', 'budget', 'status', 'created_at']
    list_filter = ['status', 'service', 'budget', 'created_at']
    list_editable = ['status']
    search_fields = ['name', 'email', 'company', 'details']
    readonly_fields = ['name', 'email', 'company', 'service', 'budget', 'details', 'ip_address', 'user_agent', 'created_at', 'updated_at']
