from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import project_views, views
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
admin.register('team', views.TeamMemberViewSet, basename='admin-team')
admin.register('capabilities', views.CapabilityViewSet, basename='admin-capability')
admin.register('services', views.ServiceViewSet, basename='admin-service')
admin.register('technologies', views.TechnologyViewSet, basename='admin-technology')
admin.register('media', views.MediaViewSet, basename='admin-media')
admin.register('inquiries', views.InquiryViewSet, basename='admin-inquiry')
admin.register('activity', views.AuditLogViewSet, basename='admin-activity')


def nested(prefix, viewset, name):
    """/admin/projects/<project_pk>/<prefix>/... — every child item is scoped to its project."""
    base = f'admin/projects/<uuid:project_pk>/{prefix}/'
    routes = [
        path(base, viewset.as_view({'get': 'list', 'post': 'create'}), name=f'{name}-list'),
        path(f'{base}reorder/', viewset.as_view({'post': 'reorder'}), name=f'{name}-reorder'),
        path(f'{base}<uuid:pk>/', viewset.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name=f'{name}-detail'),
    ]
    for act in getattr(viewset, 'extra_routes', ()):
        methods, url_name = act
        routes.append(path(f'{base}<uuid:pk>/{url_name}/', viewset.as_view({m: url_name.replace('-', '_') for m in methods}), name=f'{name}-{url_name}'))
    return routes


project_children = [
    *nested('gallery', project_views.GalleryViewSet, 'admin-project-gallery'),
    path('admin/projects/<uuid:project_pk>/gallery/bulk-delete/', project_views.GalleryViewSet.as_view({'post': 'bulk_delete'}), name='admin-project-gallery-bulk-delete'),
    *nested('videos', project_views.VideoViewSet, 'admin-project-videos'),
    *nested('build-components', project_views.BuildComponentViewSet, 'admin-project-build'),
    *nested('features', project_views.FeatureViewSet, 'admin-project-features'),
    *nested('outcomes', project_views.OutcomeViewSet, 'admin-project-outcomes'),
    *nested('stack', project_views.StackViewSet, 'admin-project-stack'),
]

urlpatterns = [
    *project_children,
    path('health/', views.HealthView.as_view(), name='health'),
    path('admin/dashboard/', views.DashboardView.as_view(), name='admin-dashboard'),
    path('admin/settings/', views.SiteSettingsView.as_view(), name='admin-settings'),
    path('admin/', include(admin.urls)),
    path('public/content/', views.PublicContentView.as_view(), name='public-content'),
    path('public/pages/<slug:slug>/', views.PublicPageView.as_view(), name='public-page'),
    path('public/projects/', views.PublicProjectListView.as_view(), name='public-projects'),
    path('public/projects/<slug:slug>/', views.PublicProjectDetailView.as_view(), name='public-project'),
    path('public/share/work/<slug:slug>/', project_views.share_page, name='public-project-share'),
    path('public/team/', views.public_list_view(TeamMember, PublicTeamMemberSerializer, ('profile_media',)), name='public-team'),
    path('public/capabilities/', views.public_list_view(Capability, PublicCapabilitySerializer), name='public-capabilities'),
    path('public/services/', views.public_list_view(Service, PublicServiceSerializer), name='public-services'),
    path('public/technologies/', views.public_list_view(TechnologyItem, PublicTechnologySerializer), name='public-technologies'),
]
