from rest_framework import serializers
from rest_framework.utils import model_meta

from accounts.models import User
from portfolio.models import ContactInquiry, InquiryNote

from . import validation
from .models import (
    AuditLog,
    Capability,
    MediaAsset,
    Page,
    PageSection,
    Project,
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

    def update(self, instance, validated_data):
        """Write only the submitted columns, so a concurrent change (e.g. a reorder) to other fields is never undone."""
        relations = model_meta.get_field_info(instance).relations
        many = {k: validated_data.pop(k) for k in list(validated_data) if k in relations and relations[k].to_many}
        for key, value in validated_data.items():
            setattr(instance, key, value)
        fields = list(validated_data)
        if fields:
            if hasattr(instance, 'updated_at'):
                fields.append('updated_at')
            instance.save(update_fields=fields)
        for key, value in many.items():
            getattr(instance, key).set(value)
        return instance


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


class ProjectSerializer(ContentSerializer):
    cover_media = MediaField()
    hero_media = MediaField()
    thumbnail_media = MediaField()
    problem_media = MediaField()
    approach_media = MediaField()
    solution_media = MediaField()
    outcome_media = MediaField()
    related_projects = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all(), many=True, required=False)
    section_counts = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['id', 'slug', 'title', 'category', 'status_label', 'short_description', 'description', 'overview', 'audience',
                  'problem_statement', 'approach', 'solution', 'outcome', 'technologies', 'project_url', 'repository_url',
                  'repository_public', 'client_name', 'show_client_name', 'project_role', 'project_duration',
                  'cover_media', 'hero_media', 'thumbnail_media', 'problem_media', 'approach_media', 'solution_media',
                  'outcome_media', 'related_projects', 'seo_title', 'seo_description', 'is_featured', 'display_order',
                  'started_at', 'completed_at', 'section_counts', 'status', 'published_at', 'created_at', 'updated_at']
        read_only_fields = PUBLISH_READONLY

    def get_section_counts(self, obj):
        """How many items each optional section has (published / total), for the editor's tab badges."""
        counts = {}
        for name in ('gallery', 'videos', 'build_components', 'features', 'outcomes', 'stack'):
            rows = getattr(obj, name).all()
            counts[name] = {'total': len(rows), 'published': sum(1 for r in rows if r.is_published)}
        return counts

    def validate_related_projects(self, value):
        if len(value) > 6:
            raise serializers.ValidationError('Choose at most 6 related projects.')
        if self.instance and any(p.pk == self.instance.pk for p in value):
            raise serializers.ValidationError('A project cannot be related to itself.')
        return value

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
    """Admin-only lead record. Visitor-supplied fields are read-only; admins manage the lead fields."""

    EDITABLE = ['lead_status', 'assigned_to', 'follow_up_at', 'last_contacted_at']

    service_label = serializers.CharField(source='get_service_display', read_only=True)
    budget_label = serializers.CharField(source='get_budget_display', read_only=True)
    lead_status_label = serializers.CharField(source='get_lead_status_display', read_only=True)
    source_label = serializers.CharField(source='get_inquiry_source_display', read_only=True)
    assigned_to = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(is_active=True), allow_null=True, required=False)
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True, default=None)
    related_project = serializers.SerializerMethodField()
    related_capability = serializers.SerializerMethodField()
    note_count = serializers.IntegerField(source='notes.count', read_only=True)

    class Meta:
        model = ContactInquiry
        fields = ['id', 'name', 'email', 'company', 'phone_number', 'service', 'service_label', 'budget', 'budget_label',
                  'details', 'inquiry_source', 'source_label', 'related_project', 'related_capability', 'lead_status',
                  'lead_status_label', 'assigned_to', 'assigned_to_name', 'last_contacted_at', 'follow_up_at',
                  'note_count', 'created_at', 'updated_at']
        read_only_fields = [f for f in fields if f not in ('lead_status', 'assigned_to', 'follow_up_at', 'last_contacted_at')]

    def get_related_project(self, obj):
        return {'slug': obj.related_project.slug, 'title': obj.related_project.title} if obj.related_project_id else None

    def get_related_capability(self, obj):
        return {'slug': obj.related_capability.slug, 'title': obj.related_capability.title} if obj.related_capability_id else None


class InquiryNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.name', read_only=True, default=None)

    class Meta:
        model = InquiryNote
        fields = ['id', 'body', 'author_name', 'created_at']
        read_only_fields = ['id', 'author_name', 'created_at']

    def validate_body(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Write something first.')
        return validation.no_html(value)


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
    """Card fields for the Work listing. The full case study comes from the detail endpoint."""

    cover = serializers.SerializerMethodField()
    repository_url = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['slug', 'title', 'category', 'status_label', 'short_description', 'description', 'problem_statement',
                  'technologies', 'project_url', 'repository_url', 'cover', 'is_featured', 'started_at', 'completed_at']

    def get_cover(self, obj):
        return self.media(obj.thumbnail_media or obj.cover_media)

    def get_repository_url(self, obj):
        return obj.repository_url if obj.repository_public else ''


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
