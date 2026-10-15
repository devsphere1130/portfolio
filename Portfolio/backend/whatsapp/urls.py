from django.urls import path

from . import views

urlpatterns = [
    path('public/whatsapp/', views.PublicWhatsAppView.as_view(), name='public-whatsapp'),
    path('admin/whatsapp/settings/', views.AdminWhatsAppSettingsView.as_view(), name='admin-whatsapp-settings'),
    path('admin/whatsapp/overview/', views.AdminWhatsAppOverviewView.as_view(), name='admin-whatsapp-overview'),
    path('admin/inquiries/<int:pk>/whatsapp/', views.InquiryWhatsAppView.as_view(), name='admin-inquiry-whatsapp'),
    path('webhooks/whatsapp/', views.WhatsAppWebhookView.as_view(), name='whatsapp-webhook'),
]
