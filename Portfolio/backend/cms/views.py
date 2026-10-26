from django.db import connection, transaction
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdminRole, IsDashboardUser
from portfolio.models import ContactInquiry

from whatsapp.models import WhatsAppConfiguration
from whatsapp.serializers import PublicWhatsAppSerializer

from . import caching
from . import pages as page_service
from . import project_views
from .audit import record
from .pagination import StandardPagination
from .media import process_image
from .models import (
    AuditLog,
    Capability,
    MediaAsset,
    Page,
    PageSection,
    Project,
    ProjectStatus,
    Service,
    SiteSettings,
    Status,
    TeamMember,
    TechnologyItem,
)
from .serializers import (
    AuditLogSerializer,
    CapabilitySerializer,
    InquiryNoteSerializer,
    InquirySerializer,
    MediaAssetSerializer,
    MediaUploadSerializer,
    PageSectionSerializer,
    PageSerializer,
    ProjectSerializer,
    PublicCapabilitySerializer,
    PublicProjectSerializer,
    PublicServiceSerializer,
    PublicSiteSettingsSerializer,
    PublicTeamMemberSerializer,
    PublicTechnologySerializer,
    ServiceSerializer,
    SiteSettingsSerializer,
    TeamMemberSerializer,
    TechnologyItemSerializer,
)


def label_of(obj):
    return getattr(obj, 'title', None) or getattr(obj, 'name', None) or str(obj)


# ---------------------------------------------------------------------------
# Admin: shared behaviour
# ---------------------------------------------------------------------------

class AuditedModelViewSet(viewsets.ModelViewSet):
    """CRUD that stamps `updated_by` and writes an audit entry for every change."""

    permission_classes = [IsDashboardUser]
    entity_type = ''
    http_method_names = ['get', 'post', 'patch', 'delete']

    def perform_create(self, serializer):
        obj = serializer.save(updated_by=self.request.user)
        record(self.request.user, f'{self.entity_type}.created', self.entity_type, obj.pk, f'Created “{label_of(obj)}”', request=self.request)

    def perform_update(self, serializer):
        obj = serializer.save(updated_by=self.request.user)
        record(self.request.user, f'{self.entity_type}.updated', self.entity_type, obj.pk, f'Updated “{label_of(obj)}”',
               {'fields': sorted(serializer.validated_data)}, request=self.request)

    def perform_destroy(self, instance):
        label, pk = label_of(instance), instance.pk
        instance.delete()
        record(self.request.user, f'{self.entity_type}.deleted', self.entity_type, pk, f'Deleted “{label}”', request=self.request)


class PublishableViewSet(AuditedModelViewSet):
    """Adds ?status= filtering, publish/unpublish and drag-to-reorder."""

    ordering_fields = ['display_order', 'title', 'name', 'updated_at', 'created_at']
    ordering = ['display_order', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        wanted = self.request.query_params.get('status')
        if wanted in dict(queryset.model._meta.get_field('status').choices):
            queryset = queryset.filter(status=wanted)
        return queryset

    def _set_status(self, request, publish):
        obj = self.get_object()
        obj.publish() if publish else obj.unpublish()
        obj.updated_by = request.user
        obj.save(update_fields=['status', 'published_at', 'updated_by', 'updated_at'])
        verb = 'published' if publish else 'unpublished'
        record(request.user, f'{self.entity_type}.{verb}', self.entity_type, obj.pk, f'{verb.capitalize()} “{label_of(obj)}”', request=request)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        return self._set_status(request, True)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        return self._set_status(request, False)

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        ids = request.data.get('ids')
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'Send {"ids": [...]} in the new order.'}, status=status.HTTP_400_BAD_REQUEST)
        model = self.get_queryset().model
        found = set(model.objects.filter(pk__in=ids).values_list('pk', flat=True))
        if len(found) != len(set(ids)):
            return Response({'detail': 'Some ids were not found.'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for index, pk in enumerate(ids):
                model.objects.filter(pk=pk).update(display_order=index, updated_by=request.user)
        record(request.user, f'{self.entity_type}.reordered', self.entity_type, '', f'Reordered {len(ids)} item(s)', request=request)
        return Response({'ok': True})


# ---------------------------------------------------------------------------
# Admin: content resources
# ---------------------------------------------------------------------------

class ProjectViewSet(PublishableViewSet):
    serializer_class = ProjectSerializer
    entity_type = 'project'
    search_fields = ['title', 'slug', 'category', 'short_description']
    queryset = Project.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset().select_related(
            'cover_media', 'hero_media', 'thumbnail_media', 'problem_media', 'approach_media', 'solution_media', 'outcome_media',
        ).prefetch_related('related_projects', 'gallery', 'videos', 'build_components', 'features', 'outcomes', 'stack')
        if self.request.query_params.get('featured') == 'true':
            queryset = queryset.filter(is_featured=True)
        return queryset

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        project = self.get_object()
        project.archive()
        project.updated_by = request.user
        project.save(update_fields=['status', 'updated_by', 'updated_at'])
        record(request.user, 'project.archived', 'project', project.pk, f'Archived “{project.title}”', request=request)
        return Response(self.get_serializer(project).data)


class TeamMemberViewSet(PublishableViewSet):
    serializer_class = TeamMemberSerializer
    entity_type = 'team_member'
    queryset = TeamMember.objects.select_related('profile_media')
    search_fields = ['name', 'role_title', 'discipline']


class CapabilityViewSet(PublishableViewSet):
    serializer_class = CapabilitySerializer
    entity_type = 'capability'
    queryset = Capability.objects.all()
    search_fields = ['title', 'slug', 'summary']


class ServiceViewSet(PublishableViewSet):
    serializer_class = ServiceSerializer
    entity_type = 'service'
    queryset = Service.objects.all()
    search_fields = ['title', 'slug', 'summary']


class TechnologyViewSet(PublishableViewSet):
    serializer_class = TechnologyItemSerializer
    entity_type = 'technology'
    queryset = TechnologyItem.objects.all()
    search_fields = ['name', 'category', 'description']
    ordering = ['category', 'display_order', 'name']
    ordering_fields = ['category', 'display_order', 'name', 'updated_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        category = self.request.query_params.get('category')
        return queryset.filter(category=category) if category else queryset


class PageViewSet(AuditedModelViewSet):
    serializer_class = PageSerializer
    entity_type = 'page'
    queryset = Page.objects.prefetch_related(Prefetch('sections', queryset=PageSection.objects.select_related('image_media')))
    search_fields = ['title', 'slug']
    pagination_class = None

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        page = page_service.publish_page(self.get_object(), request.user)
        record(request.user, 'page.published', 'page', page.pk, f'Published page “{page.title}”', request=request)
        return Response(self.get_serializer(self.get_queryset().get(pk=page.pk)).data)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        page = page_service.unpublish_page(self.get_object(), request.user)
        record(request.user, 'page.unpublished', 'page', page.pk, f'Unpublished page “{page.title}”', request=request)
        return Response(self.get_serializer(self.get_queryset().get(pk=page.pk)).data)

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        return Response(page_service.render(page_service.working_copy(self.get_object()), request))


class PageSectionViewSet(AuditedModelViewSet):
    serializer_class = PageSectionSerializer
    entity_type = 'page_section'
    queryset = PageSection.objects.select_related('page', 'image_media')
    pagination_class = None

    def get_queryset(self):
        page = self.request.query_params.get('page')
        return self.queryset.filter(page_id=page) if page else self.queryset

    def perform_create(self, serializer):
        super().perform_create(serializer)
        serializer.instance.page.touch_content()

    def perform_update(self, serializer):
        super().perform_update(serializer)
        serializer.instance.page.touch_content()

    def perform_destroy(self, instance):
        page = instance.page
        super().perform_destroy(instance)
        page.touch_content()


class MediaViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin,
                   mixins.DestroyModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsDashboardUser]
    serializer_class = MediaAssetSerializer
    queryset = MediaAsset.objects.select_related('uploaded_by')
    search_fields = ['original_filename', 'alt_text']
    ordering_fields = ['created_at', 'file_size_bytes', 'original_filename']
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_throttles(self):
        if self.action in ('create', 'replace'):
            self.throttle_scope = 'upload'
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def retrieve(self, request, *args, **kwargs):
        asset = self.get_object()
        data = self.get_serializer(asset).data
        data['references'] = [{'type': t, 'id': i, 'label': label} for t, i, label in asset.references()]
        return Response(data)

    def create(self, request, *args, **kwargs):
        upload = MediaUploadSerializer(data=request.data)
        upload.is_valid(raise_exception=True)
        source = upload.validated_data['file']
        processed = process_image(source)
        asset = MediaAsset.objects.create(
            original_filename=source.name[-255:], alt_text=upload.validated_data.get('alt_text', ''),
            uploaded_by=request.user, updated_by=request.user, **processed,
        )
        record(request.user, 'media.uploaded', 'media', asset.pk, f'Uploaded “{asset.original_filename}”', request=request)
        return Response(self.get_serializer(asset).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def replace(self, request, pk=None):
        """Swap the image file but keep the asset id, so every page using it updates at once."""
        asset = self.get_object()
        upload = MediaUploadSerializer(data=request.data)
        upload.is_valid(raise_exception=True)
        processed = process_image(upload.validated_data['file'])
        old_files = [asset.file.name, asset.thumbnail.name]
        for key, value in processed.items():
            setattr(asset, key, value)
        asset.original_filename = upload.validated_data['file'].name[-255:]
        asset.updated_by = request.user
        asset.save()
        storage = asset.file.storage
        transaction.on_commit(lambda: [storage.delete(name) for name in old_files if name])
        record(request.user, 'media.replaced', 'media', asset.pk, f'Replaced the file for “{asset.original_filename}”', request=request)
        return Response(self.get_serializer(asset).data)

    def perform_update(self, serializer):
        asset = serializer.save(updated_by=self.request.user)
        record(self.request.user, 'media.updated', 'media', asset.pk, f'Updated alt text for “{asset.original_filename}”', request=self.request)

    def destroy(self, request, *args, **kwargs):
        asset = self.get_object()
        refs = asset.references()
        if refs:
            return Response(
                {'detail': 'This image is still in use. Remove it from these places first.',
                 'references': [{'type': t, 'id': i, 'label': label} for t, i, label in refs]},
                status=status.HTTP_409_CONFLICT,
            )
        names, storage, label, pk = [asset.file.name, asset.thumbnail.name], asset.file.storage, asset.original_filename, asset.pk
        asset.delete()
        transaction.on_commit(lambda: [storage.delete(name) for name in names if name])
        record(request.user, 'media.deleted', 'media', pk, f'Deleted “{label}”', request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SiteSettingsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response(SiteSettingsSerializer(SiteSettings.load(), context={'request': request}).data)

    def patch(self, request):
        settings_obj = SiteSettings.load()
        serializer = SiteSettingsSerializer(settings_obj, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        record(request.user, 'site_settings.updated', 'site_settings', 1, 'Updated site settings',
               {'fields': sorted(serializer.validated_data)}, request=request)
        return Response(serializer.data)


class InquiryViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin,
                     mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """Private lead management for website inquiries. Admins only; never exposed publicly."""

    permission_classes = [IsAdminRole]
    serializer_class = InquirySerializer
    queryset = ContactInquiry.objects.select_related('assigned_to', 'related_project', 'related_capability')
    search_fields = ['name', 'email', 'company', 'details', 'phone_number']
    ordering_fields = ['created_at', 'lead_status', 'follow_up_at', 'last_contacted_at', 'name']
    ordering = ['-created_at']
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        queryset, params = self.queryset, self.request.query_params
        if params.get('lead_status') in ContactInquiry.LeadStatus.values:
            queryset = queryset.filter(lead_status=params['lead_status'])
        elif params.get('lead_status') == 'open':
            queryset = queryset.exclude(lead_status__in=[ContactInquiry.LeadStatus.ARCHIVED, ContactInquiry.LeadStatus.CONVERTED,
                                                         ContactInquiry.LeadStatus.NOT_QUALIFIED])
        if params.get('source') in ContactInquiry.Source.values:
            queryset = queryset.filter(inquiry_source=params['source'])
        assigned = params.get('assigned')
        if assigned == 'me':
            queryset = queryset.filter(assigned_to=self.request.user)
        elif assigned == 'none':
            queryset = queryset.filter(assigned_to__isnull=True)
        if params.get('due') == '1':
            queryset = queryset.filter(follow_up_at__lte=timezone.now())
        return queryset

    def perform_update(self, serializer):
        before = {f: getattr(serializer.instance, f) for f in InquirySerializer.EDITABLE}
        inquiry = serializer.save()
        changed = sorted(f for f in InquirySerializer.EDITABLE if getattr(inquiry, f) != before[f])
        summary = (f'Marked {inquiry.name} as {inquiry.get_lead_status_display().lower()}' if 'lead_status' in changed
                   else f'Updated lead {inquiry.name}')
        record(self.request.user, 'inquiry.updated', 'inquiry', inquiry.pk, summary, {'fields': changed}, request=self.request)

    def perform_destroy(self, instance):
        pk, name = instance.pk, instance.name
        instance.delete()
        record(self.request.user, 'inquiry.deleted', 'inquiry', pk, f'Deleted inquiry from {name}', request=self.request)

    @action(detail=True, methods=['get', 'post'])
    def notes(self, request, pk=None):
        inquiry = self.get_object()
        if request.method == 'GET':
            return Response(InquiryNoteSerializer(inquiry.notes.select_related('author'), many=True).data)
        serializer = InquiryNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.save(inquiry=inquiry, author=request.user)
        record(request.user, 'inquiry.note_added', 'inquiry', inquiry.pk, f'Added a note to {inquiry.name}', request=request)
        return Response(InquiryNoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='mark-contacted')
    def mark_contacted(self, request, pk=None):
        """The admin confirms they reached out (e.g. after sending a WhatsApp message by hand)."""
        inquiry = self.get_object()
        inquiry.last_contacted_at = timezone.now()
        if inquiry.lead_status in (ContactInquiry.LeadStatus.NEW, ContactInquiry.LeadStatus.AWAITING_RESPONSE):
            inquiry.lead_status = ContactInquiry.LeadStatus.CONTACTED
        inquiry.save(update_fields=['last_contacted_at', 'lead_status', 'updated_at'])
        record(request.user, 'inquiry.contacted', 'inquiry', inquiry.pk, f'Marked {inquiry.name} as contacted', request=request)
        return Response(self.get_serializer(inquiry).data)

    @action(detail=False, methods=['get'])
    def export(self, request):
        """CSV of the filtered leads (no internal notes). Cells are guarded against spreadsheet formula injection."""
        import csv
        from django.http import HttpResponse

        def safe(value):
            text = '' if value is None else str(value)
            return "'" + text if text[:1] in ('=', '+', '-', '@', '\t', '\r') else text

        rows = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="devsphere-inquiries-{timezone.now():%Y%m%d}.csv"'
        writer = csv.writer(response)
        writer.writerow(['Received', 'Name', 'Email', 'Phone', 'Company', 'Needs', 'Budget', 'Source', 'Related',
                         'Lead status', 'Assigned to', 'Last contacted', 'Follow up', 'Message'])
        for i in rows:
            related = (i.related_project and i.related_project.title) or (i.related_capability and i.related_capability.title) or ''
            writer.writerow([safe(v) for v in (i.created_at.isoformat(), i.name, i.email, i.phone_number, i.company,
                                                i.get_service_display(), i.get_budget_display(), i.get_inquiry_source_display(),
                                                related, i.get_lead_status_display(), i.assigned_to.email if i.assigned_to else '',
                                                i.last_contacted_at.isoformat() if i.last_contacted_at else '',
                                                i.follow_up_at.isoformat() if i.follow_up_at else '', i.details)])
        record(request.user, 'inquiry.exported', 'inquiry', '', f'Exported {rows.count()} inquiries to CSV', request=request)
        return response


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.select_related('actor_user')
    search_fields = ['summary', 'action', 'entity_type', 'actor_user__email']
    ordering_fields = ['created_at']

    def get_queryset(self):
        queryset = self.queryset
        for param in ('action', 'entity_type'):
            if self.request.query_params.get(param):
                queryset = queryset.filter(**{f'{param}__startswith': self.request.query_params[param]})
        return queryset


class DashboardView(APIView):
    """Overview numbers, straight from the database."""

    permission_classes = [IsDashboardUser]

    def get(self, request):
        def counts(model):
            row = model.objects.aggregate(total=Count('pk'), published=Count('pk', filter=Q(status=Status.PUBLISHED)))
            return {'total': row['total'], 'published': row['published']}

        data = {
            'projects': counts(Project),
            'team_members': counts(TeamMember),
            'capabilities': counts(Capability),
            'services': counts(Service),
            'technologies': counts(TechnologyItem),
            'pages': {
                'total': Page.objects.count(),
                'published': Page.objects.filter(status=Status.PUBLISHED).count(),
                'sections': PageSection.objects.count(),
                'with_unpublished_changes': sum(1 for p in Page.objects.all() if p.has_unpublished_changes),
            },
            'media': {'total': MediaAsset.objects.count()},
            'users': {'total': User.objects.filter(is_active=True).count()},
        }
        if request.user.is_admin:
            data['inquiries'] = {
                'new': ContactInquiry.objects.filter(lead_status=ContactInquiry.LeadStatus.NEW).count(),
                'total': ContactInquiry.objects.count(),
            }
            data['recent_activity'] = AuditLogSerializer(AuditLog.objects.select_related('actor_user')[:8], many=True).data
        return Response(data)


# ---------------------------------------------------------------------------
# Public (read-only, published content only)
# ---------------------------------------------------------------------------

PUBLIC_PAGES = ('home', 'about', 'contact', 'projects')


def is_preview(request):
    """Draft preview is only ever honoured for a signed-in dashboard user."""
    return request.query_params.get('preview') == '1' and IsDashboardUser().has_permission(request, None)


def published(queryset, preview):
    return queryset if preview else queryset.filter(status=Status.PUBLISHED)


def cache_headers(response, preview):
    return caching.private(response) if preview else caching.public(response)


def public_page(page, request, preview):
    if preview:
        return page_service.render(page_service.working_copy(page), request)
    if page.status != Status.PUBLISHED or not page.published_snapshot:
        return None
    return page_service.render(page.published_snapshot, request)


class PublicView(APIView):
    permission_classes = [AllowAny]


class PublicContentView(PublicView):
    """Everything the public site renders, in one cacheable request."""

    def get(self, request):
        preview = is_preview(request)
        ctx = {'request': request}
        pages = {}
        for page in Page.objects.filter(slug__in=PUBLIC_PAGES):
            rendered = public_page(page, request, preview)
            if rendered:
                pages[page.slug] = rendered
        projects = published(Project.objects.exclude(status=ProjectStatus.ARCHIVED).select_related('cover_media', 'thumbnail_media'), preview)
        data = {
            'preview': preview,
            'site': PublicSiteSettingsSerializer(SiteSettings.load(), context=ctx).data,
            'pages': pages,
            'services': PublicServiceSerializer(published(Service.objects.all(), preview), many=True).data,
            'capabilities': PublicCapabilitySerializer(published(Capability.objects.all(), preview), many=True).data,
            'technologies': PublicTechnologySerializer(published(TechnologyItem.objects.all(), preview), many=True).data,
            'team': PublicTeamMemberSerializer(published(TeamMember.objects.select_related('profile_media'), preview), many=True, context=ctx).data,
            'projects': PublicProjectSerializer(projects, many=True, context=ctx).data,
            'whatsapp': PublicWhatsAppSerializer(WhatsAppConfiguration.load()).data,
        }
        return cache_headers(Response(data), preview)


class PublicPageView(PublicView):
    def get(self, request, slug):
        preview = is_preview(request)
        rendered = public_page(get_object_or_404(Page, slug=slug), request, preview)
        if rendered is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return cache_headers(Response(rendered), preview)


class PublicProjectListView(PublicView):
    """Card data for every published project. `?page=` / `?page_size=` paginate when given."""

    def get(self, request):
        preview = is_preview(request)
        projects = published(Project.objects.exclude(status=ProjectStatus.ARCHIVED).select_related('cover_media', 'thumbnail_media'), preview)
        if 'page' in request.query_params:
            paginator = StandardPagination()
            page = paginator.paginate_queryset(projects, request, view=self)
            response = paginator.get_paginated_response(PublicProjectSerializer(page, many=True, context={'request': request}).data)
            return cache_headers(response, preview)
        return cache_headers(Response(PublicProjectSerializer(projects, many=True, context={'request': request}).data), preview)


class PublicProjectDetailView(PublicView):
    """The full case study: the project plus its published gallery, videos, features and so on."""

    def get(self, request, slug):
        preview = is_preview(request)
        return cache_headers(Response(project_views.case_study(request, slug, preview)), preview)


def public_list_view(model, serializer, select=()):
    class View(PublicView):
        def get(self, request):
            preview = is_preview(request)
            rows = published(model.objects.select_related(*select), preview)
            return cache_headers(Response(serializer(rows, many=True, context={'request': request}).data), preview)
    return View.as_view()


class HealthView(APIView):
    """Liveness + database readiness for containers and load balancers."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
        except Exception:
            return Response({'status': 'error', 'database': 'unavailable'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({'status': 'ok', 'database': 'ok'})
