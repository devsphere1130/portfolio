from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views
from .models import Capability, Service, TeamMember, TechnologyItem
from .serializers import (
    PublicCapabilitySerializer,
    PublicServiceSerializer,
    PublicTeamMemberSerializer,
    PublicTechnologySerializer,
)

admin = DefaultRouter(trailing_slash=True)
admin.register('pages', views.PageViewSet, basename='admin-page')
admin.register('sections', views.PageSectionViewSet, basename='admin-section')
admin.register('projects', views.ProjectViewSet, basename='admin-project')
admin.register('project-media', views.ProjectMediaViewSet, basename='admin-project-media')
admin.register('team', views.TeamMemberViewSet, basename='admin-team')
admin.register('capabilities', views.CapabilityViewSet, basename='admin-capability')
admin.register('services', views.ServiceViewSet, basename='admin-service')
admin.register('technologies', views.TechnologyViewSet, basename='admin-technology')
admin.register('media', views.MediaViewSet, basename='admin-media')
admin.register('inquiries', views.InquiryViewSet, basename='admin-inquiry')
admin.register('activity', views.AuditLogViewSet, basename='admin-activity')

urlpatterns = [
    path('health/', views.HealthView.as_view(), name='health'),
    path('admin/dashboard/', views.DashboardView.as_view(), name='admin-dashboard'),
    path('admin/settings/', views.SiteSettingsView.as_view(), name='admin-settings'),
    path('admin/', include(admin.urls)),
    path('public/content/', views.PublicContentView.as_view(), name='public-content'),
    path('public/pages/<slug:slug>/', views.PublicPageView.as_view(), name='public-page'),
    path('public/projects/', views.PublicProjectListView.as_view(), name='public-projects'),
    path('public/projects/<slug:slug>/', views.PublicProjectDetailView.as_view(), name='public-project'),
    path('public/team/', views.public_list_view(TeamMember, PublicTeamMemberSerializer, ('profile_media',)), name='public-team'),
    path('public/capabilities/', views.public_list_view(Capability, PublicCapabilitySerializer), name='public-capabilities'),
    path('public/services/', views.public_list_view(Service, PublicServiceSerializer), name='public-services'),
    path('public/technologies/', views.public_list_view(TechnologyItem, PublicTechnologySerializer), name='public-technologies'),
]
