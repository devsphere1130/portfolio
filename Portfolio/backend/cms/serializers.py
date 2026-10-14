from rest_framework import serializers

from portfolio.models import ContactInquiry

from . import validation
from .models import (
    AuditLog,
    Capability,
    MediaAsset,
    Page,
    PageSection,
    Project,
    ProjectMedia,
    Service,
    SiteSettings,
    TeamMember,
    TechnologyItem,
)


def absolute(request, url):
    if not url:
        return ''
    if url.startswith(('http://', 'https://')) or request is None:
        return url
    return request.build_absolute_uri(url)


def media_brief(asset, request=None):
    if asset is None:
        return None
    return {
        'id': str(asset.pk),
        'url': absolute(request, asset.url),
        'thumbnail_url': absolute(request, asset.thumbnail_url),
        'alt_text': asset.alt_text,
        'width': asset.width,
        'height': asset.height,
    }


class MediaField(serializers.PrimaryKeyRelatedField):
    """Write an asset id; read back a small {id, url, alt_text, ...} object."""

    def __init__(self, **kwargs):
        kwargs.setdefault('queryset', MediaAsset.objects.all())
        kwargs.setdefault('allow_null', True)
        kwargs.setdefault('required', False)
        super().__init__(**kwargs)

    def use_pk_only_optimization(self):
        return False

    def to_representation(self, value):
        return media_brief(value, self.context.get('request'))


# JSON fields and the validator that cleans each one.
JSON_VALIDATORS = {
    'technologies': lambda v: validation.string_list(v, 20, 40, 'Technologies'),
    'expertise': lambda v: validation.string_list(v, 12, 60, 'Expertise'),
    'deliverables': lambda v: validation.string_list(v, 12, 160, 'Deliverables'),
    'steps': validation.steps,
    'social_links': validation.social_links,
}


class ContentSerializer(serializers.ModelSerializer):
    """Base for admin writes: plain text only and validated JSON shapes."""

    def validate(self, attrs):
        for key, value in attrs.items():
            if key in JSON_VALIDATORS:
                try:
                    attrs[key] = JSON_VALIDATORS[key](value)
                except serializers.ValidationError as exc:
                    raise serializers.ValidationError({key: exc.detail}) from exc
            elif isinstance(value, str):
                try:
                    validation.no_html(value)
                except serializers.ValidationError as exc:
                    raise serializers.ValidationError({key: exc.detail}) from exc
                attrs[key] = value.strip()
        return super().validate(attrs)


PUBLISH_READONLY = ['id', 'status', 'published_at', 'created_at', 'updated_at']


# ---------------------------------------------------------------------------
# Admin serializers
# ---------------------------------------------------------------------------

class MediaAssetSerializer(ContentSerializer):
    url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True, default=None)
    reference_count = serializers.SerializerMethodField()

    class Meta:
        model = MediaAsset
        fields = ['id', 'url', 'thumbnail_url', 'original_filename', 'mime_type', 'source_format', 'file_size_bytes',
                  'width', 'height', 'alt_text', 'uploaded_by_name', 'reference_count', 'created_at', 'updated_at']
        read_only_fields = [f for f in fields if f != 'alt_text']

    def get_url(self, obj):
        return absolute(self.context.get('request'), obj.url)

    def get_thumbnail_url(self, obj):
        return absolute(self.context.get('request'), obj.thumbnail_url)

    def get_reference_count(self, obj):
        return len(obj.references())


class MediaUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    alt_text = serializers.CharField(max_length=300, required=False, allow_blank=True)

    def validate_alt_text(self, value):
        return validation.plain_text(value, 300, 'Alt text')


class SiteSettingsSerializer(ContentSerializer):
    logo_media = MediaField()
    favicon_media = MediaField()

    class Meta:
        model = SiteSettings
        fields = ['site_name', 'logo_media', 'favicon_media', 'default_title', 'default_description', 'contact_email',
                  'contact_phone', 'location_text', 'availability_text', 'footer_tagline', 'social_links', 'updated_at']
        read_only_fields = ['updated_at']


class PageSectionSerializer(ContentSerializer):
    image_media = MediaField()

    class Meta:
        model = PageSection
        fields = ['id', 'page', 'section_key', 'title', 'subtitle', 'description', 'content', 'image_media',
                  'display_order', 'is_enabled', 'updated_at']
        read_only_fields = ['id', 'updated_at']

    def validate(self, attrs):
        attrs = super().validate(attrs)
        page = attrs.get('page') or getattr(self.instance, 'page', None)
        key = attrs.get('section_key') or getattr(self.instance, 'section_key', None)
        if self.instance is not None and 'section_key' in attrs and attrs['section_key'] != self.instance.section_key:
            raise serializers.ValidationError({'section_key': 'The section key cannot change; the site layout depends on it.'})
        if self.instance is not None and 'page' in attrs and attrs['page'] != self.instance.page:
            raise serializers.ValidationError({'page': 'Sections cannot move between pages.'})
        if 'content' in attrs:
            try:
                attrs['content'] = validation.section_content(page.slug, key, attrs['content'])
            except serializers.ValidationError as exc:
                raise serializers.ValidationError({'content': exc.detail}) from exc
        return attrs


class PageSerializer(ContentSerializer):
    sections = PageSectionSerializer(many=True, read_only=True)
    has_unpublished_changes = serializers.BooleanField(read_only=True)

    class Meta:
        model = Page
        fields = ['id', 'slug', 'title', 'meta_title', 'meta_description', 'status', 'published_at',
                  'has_unpublished_changes', 'content_updated_at', 'sections', 'created_at', 'updated_at']
        read_only_fields = ['id', 'status', 'published_at', 'content_updated_at', 'created_at', 'updated_at']


class ProjectMediaSerializer(ContentSerializer):
    media_asset = MediaField(allow_null=False, required=True)

    class Meta:
        model = ProjectMedia
        fields = ['id', 'project', 'media_asset', 'caption', 'alt_text', 'display_order', 'created_at']
        read_only_fields = ['id', 'created_at']
        validators = [serializers.UniqueTogetherValidator(
            queryset=ProjectMedia.objects.all(), fields=['project', 'media_asset'],
            message='That image is already in this project gallery.',
        )]


class ProjectSerializer(ContentSerializer):
    cover_media = MediaField()
    gallery = ProjectMediaSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ['id', 'slug', 'title', 'category', 'short_description', 'description', 'problem_statement', 'solution',
                  'outcome', 'technologies', 'project_url', 'repository_url', 'cover_media', 'gallery', 'is_featured',
                  'display_order', 'started_at', 'completed_at', 'status', 'published_at', 'created_at', 'updated_at']
        read_only_fields = PUBLISH_READONLY

    def validate(self, attrs):
        attrs = super().validate(attrs)
        start = attrs.get('started_at', getattr(self.instance, 'started_at', None))
        end = attrs.get('completed_at', getattr(self.instance, 'completed_at', None))
        if start and end and end < start:
            raise serializers.ValidationError({'completed_at': 'Completion date must be after the start date.'})
        return attrs


class TeamMemberSerializer(ContentSerializer):
    profile_media = MediaField()

    class Meta:
        model = TeamMember
        fields = ['id', 'name', 'slug', 'role_title', 'discipline', 'experience_text', 'location_text', 'focus', 'short_bio',
                  'full_bio', 'profile_media', 'portrait_position', 'expertise_label', 'expertise', 'display_order',
                  'status', 'published_at', 'created_at', 'updated_at']
        read_only_fields = PUBLISH_READONLY


class CapabilitySerializer(ContentSerializer):
    class Meta:
        model = Capability
        fields = ['id', 'slug', 'title', 'card_description', 'headline', 'summary', 'example', 'deliverables_label',
                  'deliverables', 'steps', 'business_outcome', 'note', 'icon_key', 'display_order', 'status',
                  'published_at', 'created_at', 'updated_at']
        read_only_fields = PUBLISH_READONLY


class ServiceSerializer(ContentSerializer):
    class Meta:
        model = Service
        fields = ['id', 'slug', 'title', 'headline', 'summary', 'example', 'steps', 'deliverables', 'audience', 'note',
                  'display_order', 'status', 'published_at', 'created_at', 'updated_at']
        read_only_fields = PUBLISH_READONLY


class TechnologyItemSerializer(ContentSerializer):
    class Meta:
        model = TechnologyItem
        fields = ['id', 'name', 'category', 'description', 'icon_key', 'proficiency_label', 'display_order', 'status',
                  'published_at', 'created_at', 'updated_at']
        read_only_fields = PUBLISH_READONLY


class InquirySerializer(serializers.ModelSerializer):
    service_label = serializers.CharField(source='get_service_display', read_only=True)
    budget_label = serializers.CharField(source='get_budget_display', read_only=True)

    class Meta:
        model = ContactInquiry
        fields = ['id', 'name', 'email', 'company', 'service', 'service_label', 'budget', 'budget_label', 'details',
                  'status', 'created_at', 'updated_at']
        read_only_fields = [f for f in fields if f != 'status']


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor_user.name', read_only=True, default=None)
    actor_email = serializers.CharField(source='actor_user.email', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'entity_type', 'entity_id', 'summary', 'metadata', 'actor_name', 'actor_email',
                  'ip_address', 'created_at']


# ---------------------------------------------------------------------------
# Public serializers — display fields only
# ---------------------------------------------------------------------------

class PublicMediaMixin:
    def media(self, asset):
        return media_brief(asset, self.context.get('request'))


class PublicProjectSerializer(PublicMediaMixin, serializers.ModelSerializer):
    cover = serializers.SerializerMethodField()
    gallery = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['slug', 'title', 'category', 'short_description', 'description', 'problem_statement', 'solution',
                  'outcome', 'technologies', 'project_url', 'repository_url', 'cover', 'gallery', 'is_featured',
                  'started_at', 'completed_at']

    def get_cover(self, obj):
        return self.media(obj.cover_media)

    def get_gallery(self, obj):
        return [{**self.media(item.media_asset), 'caption': item.caption, 'alt_text': item.alt_text or item.media_asset.alt_text}
                for item in obj.gallery.all()]


class PublicTeamMemberSerializer(PublicMediaMixin, serializers.ModelSerializer):
    portrait = serializers.SerializerMethodField()

    class Meta:
        model = TeamMember
        fields = ['slug', 'name', 'role_title', 'discipline', 'experience_text', 'location_text', 'focus', 'short_bio',
                  'full_bio', 'portrait', 'portrait_position', 'expertise_label', 'expertise']

    def get_portrait(self, obj):
        return self.media(obj.profile_media)


class PublicCapabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Capability
        fields = ['slug', 'title', 'card_description', 'headline', 'summary', 'example', 'deliverables_label',
                  'deliverables', 'steps', 'business_outcome', 'note', 'icon_key']


class PublicServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['slug', 'title', 'headline', 'summary', 'example', 'steps', 'deliverables', 'audience', 'note']


class PublicTechnologySerializer(serializers.ModelSerializer):
    class Meta:
        model = TechnologyItem
        fields = ['name', 'category', 'description', 'icon_key', 'proficiency_label']


class PublicSiteSettingsSerializer(PublicMediaMixin, serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()
    favicon = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = ['site_name', 'logo', 'favicon', 'default_title', 'default_description', 'contact_email',
                  'contact_phone', 'location_text', 'availability_text', 'footer_tagline', 'social_links']

    def get_logo(self, obj):
        return self.media(obj.logo_media)

    def get_favicon(self, obj):
        return self.media(obj.favicon_media)
