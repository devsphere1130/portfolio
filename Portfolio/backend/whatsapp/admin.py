from django.contrib import admin

from .models import WhatsAppConfiguration, WhatsAppConversation, WhatsAppMessage, WhatsAppWebhookEvent

admin.site.register(WhatsAppConfiguration)
admin.site.register(WhatsAppConversation, list_display=['wa_id', 'profile_name', 'inquiry', 'last_message_at'])


@admin.register(WhatsAppMessage)
class WhatsAppMessageAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'conversation', 'direction', 'message_type', 'status']
    list_filter = ['direction', 'status']
    readonly_fields = [f.name for f in WhatsAppMessage._meta.fields]  # API-sourced records are not hand-edited


@admin.register(WhatsAppWebhookEvent)
class WhatsAppWebhookEventAdmin(admin.ModelAdmin):
    list_display = ['received_at', 'event_type', 'state', 'diagnostic']
    list_filter = ['event_type', 'state']
    readonly_fields = [f.name for f in WhatsAppWebhookEvent._meta.fields]
