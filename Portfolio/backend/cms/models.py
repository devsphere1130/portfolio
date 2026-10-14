import uuid

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

slug_validator = RegexValidator(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', 'Use lowercase letters, numbers and single hyphens.')
position_validator = RegexValidator(r'^\d{1,3}% \d{1,3}%$', 'Use a position like "50% 50%".')


# ---------------------------------------------------------------------------
# Shared building blocks
# ---------------------------------------------------------------------------

class TrackedModel(models.Model):
    """UUID key, timestamps and who last changed the row."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )

    class Meta:
        abstract = True


class Status(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PUBLISHED = 'published', 'Published'


class PublishableModel(TrackedModel):
    """List-style content. Only `published` rows ever reach the public API."""

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    display_order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        abstract = True
        ordering = ['display_order', 'created_at']

    def publish(self):
        self.status = Status.PUBLISHED
        self.published_at = timezone.now()

    def unpublish(self):
        self.status = Status.DRAFT


def media_upload_to(instance, filename):
    # Never trust the uploaded name: storage keys are random and the extension is ours.
    return f'media/{timezone.now():%Y/%m}/{uuid.uuid4().hex}.webp'


def media_thumb_upload_to(instance, filename):
    return f'media/{timezone.now():%Y/%m}/{uuid.uuid4().hex}-thumb.webp'


# ---------------------------------------------------------------------------
# Media
# ---------------------------------------------------------------------------

class MediaAsset(TrackedModel):
    """An uploaded image. The file lives in storage (local volume or S3); this row holds its metadata."""

    original_filename = models.CharField(max_length=255)
    file = models.FileField(upload_to=media_upload_to, max_length=255)
    thumbnail = models.FileField(upload_to=media_thumb_upload_to, max_length=255, blank=True)
    mime_type = models.CharField(max_length=64)
    source_format = models.CharField(max_length=16, help_text='Format of the original upload, e.g. JPEG.')
    file_size_bytes = models.PositiveIntegerField()
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    alt_text = models.CharField(max_length=300, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploads'
    )

    class Meta:
        db_table = 'media_assets'
        ordering = ['-created_at']

    def __str__(self):
        return self.original_filename

    @property
    def url(self):
        return self.file.url if self.file else ''

    @property
    def thumbnail_url(self):
        return self.thumbnail.url if self.thumbnail else self.url

    def references(self):
        """Everything that currently points at this asset, as (type, id, label) tuples."""
        refs = []
        for rel in self._meta.related_objects:
            if rel.related_model is MediaAsset or not rel.one_to_many:
                continue
            accessor = rel.get_accessor_name()
            for obj in getattr(self, accessor).all()[:50]:
                label = getattr(obj, 'title', None) or getattr(obj, 'name', None) or getattr(obj, 'site_name', None) or str(obj)
                refs.append((rel.related_model._meta.db_table, str(obj.pk), str(label)))
        return refs


# ---------------------------------------------------------------------------
# Site settings (singleton)
# ---------------------------------------------------------------------------

class SiteSettings(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    site_name = models.CharField(max_length=120, default='DevSphere')
    logo_media = models.ForeignKey(MediaAsset, on_delete=models.PROTECT, null=True, blank=True, related_name='as_logo')
    favicon_media = models.ForeignKey(MediaAsset, on_delete=models.PROTECT, null=True, blank=True, related_name='as_favicon')
    default_title = models.CharField(max_length=160, blank=True)
    default_description = models.CharField(max_length=300, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)
    location_text = models.CharField(max_length=160, blank=True)
    availability_text = models.CharField(max_length=160, blank=True)
    footer_tagline = models.CharField(max_length=300, blank=True)
    social_links = models.JSONField(default=list, blank=True, help_text='[{"label": "GitHub", "url": "https://..."}]')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        db_table = 'site_settings'
        verbose_name_plural = 'Site settings'
        constraints = [models.CheckConstraint(condition=Q(id=1), name='site_settings_singleton')]

    def __str__(self):
        return self.site_name

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


# ---------------------------------------------------------------------------
# Pages & sections
# ---------------------------------------------------------------------------

class Page(TrackedModel):
    """
    A public page. Sections are edited as a working copy; `publish()` freezes them into
    `published_snapshot`, which is the only thing the public API serves.
    """

    slug = models.SlugField(max_length=80, unique=True, validators=[slug_validator])
    title = models.CharField(max_length=160)
    meta_title = models.CharField(max_length=160, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    published_snapshot = models.JSONField(null=True, blank=True)
    content_updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'pages'
        ordering = ['slug']
        constraints = [
            models.CheckConstraint(
                condition=Q(status='draft') | Q(published_snapshot__isnull=False, published_at__isnull=False),
                name='pages_published_requires_snapshot',
            )
        ]

    def __str__(self):
        return self.title

    @property
    def has_unpublished_changes(self):
        return self.published_at is None or self.content_updated_at > self.published_at

    def touch_content(self):
        Page.objects.filter(pk=self.pk).update(content_updated_at=timezone.now())


class PageSection(TrackedModel):
    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name='sections')
    section_key = models.CharField(max_length=60, validators=[slug_validator])
    title = models.CharField(max_length=200, blank=True)
    subtitle = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True, max_length=2000)
    content = models.JSONField(default=dict, blank=True)
    image_media = models.ForeignKey(MediaAsset, on_delete=models.PROTECT, null=True, blank=True, related_name='page_sections')
    display_order = models.PositiveIntegerField(default=0)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = 'page_sections'
        ordering = ['page', 'display_order']
        constraints = [models.UniqueConstraint(fields=['page', 'section_key'], name='page_sections_unique_key')]

    def __str__(self):
        return f'{self.page.slug}/{self.section_key}'


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

class Project(PublishableModel):
    slug = models.SlugField(max_length=120, unique=True, validators=[slug_validator])
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=80, blank=True)
    short_description = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True, max_length=5000)
    problem_statement = models.TextField(blank=True, max_length=3000)
    solution = models.TextField(blank=True, max_length=3000)
    outcome = models.TextField(blank=True, max_length=3000)
    technologies = models.JSONField(default=list, blank=True)
    project_url = models.URLField(blank=True)
    repository_url = models.URLField(blank=True)
    cover_media = models.ForeignKey(MediaAsset, on_delete=models.PROTECT, null=True, blank=True, related_name='project_covers')
    is_featured = models.BooleanField(default=False, db_index=True)
    started_at = models.DateField(null=True, blank=True)
    completed_at = models.DateField(null=True, blank=True)

    class Meta(PublishableModel.Meta):
        db_table = 'projects'
        constraints = [
            models.CheckConstraint(
                condition=Q(completed_at__isnull=True) | Q(started_at__isnull=True) | Q(completed_at__gte=models.F('started_at')),
                name='projects_dates_in_order',
            )
        ]

    def __str__(self):
        return self.title


class ProjectMedia(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='gallery')
    media_asset = models.ForeignKey(MediaAsset, on_delete=models.PROTECT, related_name='project_gallery')
    caption = models.CharField(max_length=300, blank=True)
    alt_text = models.CharField(max_length=300, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'project_media'
        ordering = ['display_order', 'created_at']
        constraints = [models.UniqueConstraint(fields=['project', 'media_asset'], name='project_media_unique')]

    def __str__(self):
        return f'{self.project} · {self.media_asset}'


# ---------------------------------------------------------------------------
# Team, capabilities, services, technology
# ---------------------------------------------------------------------------

class TeamMember(PublishableModel):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=120, unique=True, validators=[slug_validator])
    role_title = models.CharField(max_length=120)
    discipline = models.CharField(max_length=80, blank=True)
    experience_text = models.CharField(max_length=40, blank=True, help_text='e.g. "2+" (years)')
    location_text = models.CharField(max_length=160, blank=True)
    focus = models.CharField(max_length=200, blank=True)
    short_bio = models.TextField(blank=True, max_length=1000)
    full_bio = models.TextField(blank=True, max_length=5000)
    profile_media = models.ForeignKey(MediaAsset, on_delete=models.PROTECT, null=True, blank=True, related_name='team_portraits')
    portrait_position = models.CharField(max_length=12, blank=True, validators=[position_validator])
    expertise_label = models.CharField(max_length=60, default='Expertise')
    expertise = models.JSONField(default=list, blank=True)

    class Meta(PublishableModel.Meta):
        db_table = 'team_members'

    def __str__(self):
        return self.name


class Capability(PublishableModel):
    """Engineering capabilities (homepage "From complex ideas..." cards). Distinct from services."""

    slug = models.SlugField(max_length=120, unique=True, validators=[slug_validator])
    title = models.CharField(max_length=120)
    card_description = models.CharField(max_length=300, blank=True)
    headline = models.CharField(max_length=200, blank=True)
    summary = models.TextField(blank=True, max_length=2000)
    example = models.TextField(blank=True, max_length=2000)
    deliverables_label = models.CharField(max_length=60, default='What we can build')
    deliverables = models.JSONField(default=list, blank=True)
    steps = models.JSONField(default=list, blank=True)
    business_outcome = models.TextField(blank=True, max_length=1000)
    note = models.CharField(max_length=500, blank=True)
    icon_key = models.CharField(max_length=40, blank=True)

    class Meta(PublishableModel.Meta):
        db_table = 'capabilities'
        verbose_name_plural = 'Capabilities'

    def __str__(self):
        return self.title


class Service(PublishableModel):
    """Service offerings (the numbered strip below the hero)."""

    slug = models.SlugField(max_length=120, unique=True, validators=[slug_validator])
    title = models.CharField(max_length=120)
    headline = models.CharField(max_length=200, blank=True)
    summary = models.TextField(blank=True, max_length=2000)
    example = models.TextField(blank=True, max_length=2000)
    steps = models.JSONField(default=list, blank=True)
    deliverables = models.JSONField(default=list, blank=True)
    audience = models.TextField(blank=True, max_length=1000)
    note = models.CharField(max_length=500, blank=True)

    class Meta(PublishableModel.Meta):
        db_table = 'services'

    def __str__(self):
        return self.title


class TechnologyItem(PublishableModel):
    name = models.CharField(max_length=80)
    category = models.CharField(max_length=80, db_index=True)
    description = models.CharField(max_length=200, blank=True)
    icon_key = models.CharField(max_length=40, blank=True)
    proficiency_label = models.CharField(max_length=40, blank=True, help_text='Only set if it reflects a claim you stand behind.')

    class Meta(PublishableModel.Meta):
        db_table = 'technology_stack'
        ordering = ['category', 'display_order', 'name']
        constraints = [models.UniqueConstraint(fields=['category', 'name'], name='technology_unique_per_category')]

    def __str__(self):
        return f'{self.category}: {self.name}'


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

class AuditLog(models.Model):
    actor_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    action = models.CharField(max_length=60, db_index=True)
    entity_type = models.CharField(max_length=60, db_index=True)
    entity_id = models.CharField(max_length=64, blank=True)
    summary = models.CharField(max_length=300)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['entity_type', 'entity_id'])]

    def __str__(self):
        return f'{self.created_at:%Y-%m-%d %H:%M} {self.action}'
