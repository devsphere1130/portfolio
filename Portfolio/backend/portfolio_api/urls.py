"""URL configuration. The React dashboard owns /admin; Django's own admin lives at /django-admin/."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('cms.urls')),
    path('api/', include('portfolio.urls')),
    path('api/', include('whatsapp.urls')),
]

handler404 = 'cms.exceptions.json_not_found'

if settings.DEBUG and settings.MEDIA_STORAGE == 'local':
    # Development only. In production, media is served by object storage (or the web server).
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
