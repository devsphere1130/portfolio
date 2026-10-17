from django.urls import path

from .views import ContactInquiryView

urlpatterns = [
    path('contact/', ContactInquiryView.as_view(), name='contact-inquiry'),
]
