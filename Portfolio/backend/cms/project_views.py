"""
Case-study admin endpoints (all nested under one project) and the public case-study endpoints.

Every child endpoint is scoped by the project id in the URL: an item id from another project is a 404,
so one project's permissions can never modify or delete another project's media.
"""

from html import escape

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Prefetch
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from accounts.permissions import IsDashboardUser

from . import video as video_rules
from .audit import record
from .models import (
    Project,
    ProjectBuildComponent,
    ProjectFeature,
    ProjectMedia,
    ProjectOutcome,
    ProjectStatus,
    ProjectTechnology,
    ProjectVideo,
    video_upload_to,
)
from .project_serializers import (
    BuildComponentSerializer,
    FeatureSerializer,
    GalleryItemSerializer,
    OutcomeSerializer,
    PublicCaseStudy,
    StackItemSerializer,
    VideoSerializer,
)



# ---------------------------------------------------------------------------
# Admin: nested child items
# ---------------------------------------------------------------------------

class ProjectChildViewSet(viewsets.ModelViewSet):
    permission_classes = [IsDashboardUser]
    pagination_class = None
    http_method_names = ['get', 'post', 'patch', 'delete']
    model = None
    label = 'item'
    select = ()

    def project(self):
        if not hasattr(self, '_project'):
            self._project = get_object_or_404(Project, pk=self.kwargs['project_pk'])
        return self._project

    def get_queryset(self):
        return self.model.objects.filter(project=self.project()).select_related(*self.select)

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'project': self.project()}

    def audit(self, verb, summary, **meta):
        project = self.project()
        record(self.request.user, f'project_{self.label.replace(" ", "_")}.{verb}', 'project', project.pk,
               f'{summary} on “{project.title}”', meta, request=self.request)

    def touch_project(self):
        Project.objects.filter(pk=self.project().pk).update(updated_by=self.request.user)

    def perform_create(self, serializer):
        order = self.get_queryset().count()
        obj = serializer.save(project=self.project(), **({} if 'display_order' in serializer.validated_data else {'display_order': order}))
        self.touch_project()
        self.audit('added', f'Added a {self.label}')
        return obj

    def perform_update(self, serializer):
        serializer.save()
        self.touch_project()
        self.audit('updated', f'Updated a {self.label}', fields=sorted(serializer.validated_data))

    def perform_destroy(self, instance):
        instance.delete()
        self.touch_project()
        self.audit('removed', f'Removed a {self.label}')

    @action(detail=False, methods=['post'])
    def reorder(self, request, project_pk=None):
        ids = request.data.get('ids')
        if not isinstance(ids, list) or not ids or len(ids) != len(set(map(str, ids))):
            return Response({'detail': 'Send {"ids": [...]} with each item once, in the new order.'}, status=status.HTTP_400_BAD_REQUEST)
        mine = {str(pk) for pk in self.get_queryset().values_list('pk', flat=True)}
        if not {str(i) for i in ids} <= mine:
            return Response({'detail': 'Some items do not belong to this project.'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for index, pk in enumerate(ids):
                self.model.objects.filter(pk=pk, project=self.project()).update(display_order=index)
        self.audit('reordered', f'Reordered {len(ids)} {self.label}(s)')
        return Response(self.get_serializer(self.get_queryset(), many=True).data)


class GalleryViewSet(ProjectChildViewSet):
    model, label, select = ProjectMedia, 'gallery image', ('media_asset',)
    serializer_class = GalleryItemSerializer

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request, project_pk=None):
        ids = request.data.get('ids')
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'Send {"ids": [...]}.'}, status=status.HTTP_400_BAD_REQUEST)
        rows = self.get_queryset().filter(pk__in=ids)
        if rows.count() != len(set(map(str, ids))):
            return Response({'detail': 'Some images do not belong to this project.'}, status=status.HTTP_400_BAD_REQUEST)
        count = rows.count()
        rows.delete()
        self.touch_project()
        self.audit('removed', f'Removed {count} gallery image(s)')
        return Response({'removed': count})


class BuildComponentViewSet(ProjectChildViewSet):
    model, label, select = ProjectBuildComponent, 'build component', ('media', 'video')
    serializer_class = BuildComponentSerializer


class FeatureViewSet(ProjectChildViewSet):
    model, label, select = ProjectFeature, 'feature', ('media',)
    serializer_class = FeatureSerializer


class OutcomeViewSet(ProjectChildViewSet):
    model, label = ProjectOutcome, 'outcome'
    serializer_class = OutcomeSerializer


class StackViewSet(ProjectChildViewSet):
    model, label, select = ProjectTechnology, 'technology', ('technology',)
    serializer_class = StackItemSerializer


class VideoViewSet(ProjectChildViewSet):
    """
    Upload flow: create the video (title, source), then
      POST <id>/upload/ {"size": n} -> {"mode": "server", "url"} or {"mode": "direct", "method": "PUT", "url", "headers"}
      server mode: POST the file to <id>/file/     direct mode: PUT it to the bucket URL, then POST <id>/complete/
    The video only becomes `ready` after the file has been stored and validated.
    """

    model, label, select = ProjectVideo, 'video', ('poster_media',)
    serializer_class = VideoSerializer
    extra_routes = [(['post'], 'upload'), (['post'], 'file'), (['post'], 'complete'), (['post', 'delete'], 'captions'),
                    (['post'], 'publish'), (['post'], 'unpublish')]

    def get_throttles(self):
        if self.action in ('upload', 'file', 'complete', 'captions'):
            self.throttle_scope = 'upload'
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def _make_primary(self, video):
        with transaction.atomic():
            self.get_queryset().exclude(pk=video.pk).filter(is_primary=True).update(is_primary=False)
            ProjectVideo.objects.filter(pk=video.pk).update(is_primary=True)

    def perform_create(self, serializer):
        wants_primary = serializer.validated_data.pop('is_primary', False) or not self.get_queryset().exists()
        video = super().perform_create(serializer)
        video.uploaded_by = self.request.user
        video.save(update_fields=['uploaded_by'])
        if wants_primary:
            self._make_primary(video)

    def perform_update(self, serializer):
        wants_primary = serializer.validated_data.pop('is_primary', None)
        super().perform_update(serializer)
        if wants_primary:
            self._make_primary(serializer.instance)
        elif wants_primary is False:
            ProjectVideo.objects.filter(pk=serializer.instance.pk).update(is_primary=False)

    def _respond(self, video):
        video.refresh_from_db()
        return Response(self.get_serializer(video).data)

    def _store_result(self, video, name, facts):
        """Swap in a validated file, keeping the old one until the database change commits."""
        old_name = video.video_file.name if video.video_file and video.video_file.name != name else ''
        storage = video.video_file.storage
        video.video_file.name = name
        for key, value in facts.items():
            setattr(video, key, value)
        video.processing_status = ProjectVideo.State.READY
        video.failure_reason = ''
        video.pending_key = ''
        video.uploaded_by = self.request.user
        video.save()
        if old_name:
            transaction.on_commit(lambda: storage.delete(old_name))
        self.audit('uploaded', 'Uploaded a video file')

    def _fail(self, video, message):
        # A failed replacement keeps the previous (still valid) file live.
        if not video.video_file:
            video.processing_status = ProjectVideo.State.FAILED
            video.is_published = False
        video.failure_reason = message[:300]
        video.pending_key = ''
        video.save(update_fields=['processing_status', 'is_published', 'failure_reason', 'pending_key', 'updated_at'])

    def _require_upload_source(self, video):
        if video.source_type != ProjectVideo.Source.UPLOAD:
            return Response({'detail': 'This video uses an external link; there is no file to upload.'}, status=status.HTTP_400_BAD_REQUEST)
        return None

    @action(detail=True, methods=['post'])
    def upload(self, request, project_pk=None, pk=None):
        video = self.get_object()
        if (problem := self._require_upload_source(video)):
            return problem
        limits = {'max_bytes': video_rules.max_upload_bytes(), 'accept': 'video/mp4'}
        if settings.MEDIA_STORAGE != 's3':
            return Response({'mode': 'server', 'url': f'/admin/projects/{video.project_id}/videos/{video.pk}/file/', **limits})
        # Direct upload with a presigned PUT (S3 and Cloudflare R2; R2 has no presigned POST forms).
        # The exact size is signed into the URL, so the bucket rejects any other length.
        try:
            size = int(request.data.get('size'))
        except (TypeError, ValueError):
            return Response({'size': ['Send the file size in bytes.']}, status=status.HTTP_400_BAD_REQUEST)
        if not 32 <= size <= limits['max_bytes']:
            return Response({'size': [f'Videos must be {settings.VIDEO_MAX_UPLOAD_MB} MB or smaller.']}, status=status.HTTP_400_BAD_REQUEST)
        storage = default_storage
        name = video_upload_to(video, 'upload.mp4')
        headers = {'Content-Type': 'video/mp4', 'Cache-Control': 'public, max-age=31536000, immutable'}
        url = storage.connection.meta.client.generate_presigned_url(
            'put_object',
            Params={'Bucket': storage.bucket_name, 'Key': storage._normalize_name(name),  # includes the location prefix
                    'ContentType': headers['Content-Type'], 'CacheControl': headers['Cache-Control'], 'ContentLength': size},
            ExpiresIn=settings.VIDEO_DIRECT_UPLOAD_EXPIRY_SECONDS,
            HttpMethod='PUT',
        )
        if video.pending_key:
            default_storage.delete(video.pending_key)
        video.pending_key = name
        video.save(update_fields=['pending_key', 'updated_at'])
        return Response({'mode': 'direct', 'method': 'PUT', 'url': url, 'headers': headers, **limits})

    @action(detail=True, methods=['post'])
    def file(self, request, project_pk=None, pk=None):
        video = self.get_object()
        if (problem := self._require_upload_source(video)):
            return problem
        upload = request.FILES.get('file')
        if upload is None:
            return Response({'file': ['Choose a video file to upload.']}, status=status.HTTP_400_BAD_REQUEST)
        try:
            facts = video_rules.inspect_upload(upload)
        except video_rules.VideoError as exc:
            self._fail(video, str(exc))
            return Response({'file': [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
        name = default_storage.save(video_upload_to(video, upload.name), upload)
        try:
            with transaction.atomic():
                self._store_result(video, name, facts)
        except Exception:
            default_storage.delete(name)  # never leave an unreferenced file behind
            raise
        return self._respond(video)

    @action(detail=True, methods=['post'])
    def complete(self, request, project_pk=None, pk=None):
        video = self.get_object()
        if (problem := self._require_upload_source(video)):
            return problem
        name = video.pending_key
        if not name or settings.MEDIA_STORAGE != 's3':
            return Response({'detail': 'There is no direct upload waiting to be checked.'}, status=status.HTTP_400_BAD_REQUEST)
        storage = default_storage
        client, bucket, key = storage.connection.meta.client, storage.bucket_name, storage._normalize_name(name)
        try:
            head = client.head_object(Bucket=bucket, Key=key)
        except Exception:
            return Response({'detail': 'The upload was not found in storage. Try uploading again.'}, status=status.HTTP_400_BAD_REQUEST)

        def read_at(offset, length):
            end = min(offset + length, head['ContentLength']) - 1
            if end < offset:
                return b''
            return client.get_object(Bucket=bucket, Key=key, Range=f'bytes={offset}-{end}')['Body'].read()

        try:
            facts = video_rules.inspect_mp4(read_at, head['ContentLength'])
        except video_rules.VideoError as exc:
            storage.delete(name)
            self._fail(video, str(exc))
            return Response({'file': [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            self._store_result(video, name, facts)
        return self._respond(video)

    @action(detail=True, methods=['post', 'delete'])
    def captions(self, request, project_pk=None, pk=None):
        video = self.get_object()
        if (problem := self._require_upload_source(video)):
            return problem
        old_name, storage = video.captions_file.name, video.captions_file.storage
        if request.method == 'DELETE':
            video.captions_file = ''
            video.save(update_fields=['captions_file', 'updated_at'])
        else:
            upload = request.FILES.get('file')
            if upload is None:
                return Response({'file': ['Choose a .vtt caption file.']}, status=status.HTTP_400_BAD_REQUEST)
            try:
                data = video_rules.validate_captions(upload)
            except Exception as exc:  # ValidationError carries the message
                detail = getattr(exc, 'detail', None) or [str(exc)]
                return Response({'file': detail}, status=status.HTTP_400_BAD_REQUEST)
            video.captions_file.save('captions.vtt', ContentFile(data), save=False)
            video.save(update_fields=['captions_file', 'updated_at'])
        if old_name:
            transaction.on_commit(lambda: storage.delete(old_name))
        self.audit('captions', 'Updated video captions')
        return self._respond(video)

    def _set_published(self, request, value):
        video = self.get_object()
        serializer = self.get_serializer(video, data={'is_published': value}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self.audit('published' if value else 'unpublished', ('Published' if value else 'Unpublished') + ' a video')
        return self._respond(video)

    @action(detail=True, methods=['post'])
    def publish(self, request, project_pk=None, pk=None):
        return self._set_published(request, True)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, project_pk=None, pk=None):
        return self._set_published(request, False)


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------

def published_children(queryset):
    published = lambda qs: qs.filter(is_published=True)  # noqa: E731
    return queryset.select_related('cover_media', 'hero_media', 'problem_media', 'approach_media', 'solution_media', 'outcome_media').prefetch_related(
        Prefetch('gallery', queryset=published(ProjectMedia.objects.select_related('media_asset')), to_attr='published_gallery'),
        Prefetch('videos', queryset=published(ProjectVideo.objects.select_related('poster_media')), to_attr='published_videos'),
        Prefetch('build_components', queryset=published(ProjectBuildComponent.objects.select_related('media')), to_attr='published_build_components'),
        Prefetch('features', queryset=published(ProjectFeature.objects.select_related('media')), to_attr='published_features'),
        Prefetch('outcomes', queryset=published(ProjectOutcome.objects.all()), to_attr='published_outcomes'),
        Prefetch('stack', queryset=published(ProjectTechnology.objects.select_related('technology')).order_by('display_order', 'created_at'), to_attr='published_stack'),
    )


def related_for(project, limit=3):
    """Projects the editor chose; otherwise others in the same category. Published only, never itself."""
    base = Project.objects.filter(status=ProjectStatus.PUBLISHED).exclude(pk=project.pk).select_related('cover_media', 'thumbnail_media')
    chosen = list(base.filter(pk__in=project.related_projects.values('pk')).order_by('display_order')[:6])
    if chosen or not project.category:
        return chosen
    return list(base.filter(category__iexact=project.category).order_by('display_order')[:limit])


def case_study(request, slug, preview):
    queryset = Project.objects.exclude(status=ProjectStatus.ARCHIVED) if preview else Project.objects.filter(status=ProjectStatus.PUBLISHED)
    project = get_object_or_404(published_children(queryset), slug=slug)
    return PublicCaseStudy(project, request, related_for(project)).data()


def share_page(request, slug):
    """
    Minimal HTML with this project's title, description and image, for link-preview crawlers
    (WhatsApp, Slack, LinkedIn, X, Facebook) that don't run JavaScript. nginx sends only those
    user agents here; people get the normal app. See docs/CASE_STUDIES.md.
    """
    project = get_object_or_404(Project.objects.filter(status=ProjectStatus.PUBLISHED).select_related('hero_media', 'cover_media'), slug=slug)
    origin = settings.PUBLIC_SITE_URL or request.build_absolute_uri('/').rstrip('/')
    url = f'{origin}/work/{project.slug}'
    title = project.seo_title or project.title
    description = project.seo_description or project.short_description or project.description[:180]
    image = project.hero_media or project.cover_media
    image_url = request.build_absolute_uri(image.url) if image else ''
    tags = [
        f'<title>{escape(title)}</title>',
        f'<meta name="description" content="{escape(description)}">',
        f'<link rel="canonical" href="{escape(url)}">',
        '<meta property="og:type" content="article">',
        f'<meta property="og:title" content="{escape(title)}">',
        f'<meta property="og:description" content="{escape(description)}">',
        f'<meta property="og:url" content="{escape(url)}">',
        f'<meta name="twitter:card" content="{"summary_large_image" if image_url else "summary"}">',
    ]
    if image_url:
        tags += [f'<meta property="og:image" content="{escape(image_url)}">',
                 f'<meta property="og:image:width" content="{image.width}">',
                 f'<meta property="og:image:height" content="{image.height}">']
    body = (f'<!doctype html><html lang="en"><head><meta charset="utf-8">{"".join(tags)}</head>'
            f'<body><h1>{escape(project.title)}</h1><p>{escape(description)}</p><a href="{escape(url)}">View the case study</a></body></html>')
    response = HttpResponse(body, content_type='text/html; charset=utf-8')
    response['Cache-Control'] = 'public, max-age=300'
    return response
