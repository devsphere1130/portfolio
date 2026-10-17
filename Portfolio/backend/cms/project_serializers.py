"""Serializers for project case studies: admin child items and the public case-study payload."""

from rest_framework import serializers

from . import video as video_rules
from .models import (
    ProjectBuildComponent,
    ProjectFeature,
    ProjectMedia,
    ProjectOutcome,
    ProjectTechnology,
    ProjectVideo,
    TechnologyItem,
)
from .serializers import ContentSerializer, MediaField, absolute, media_brief

# Icons the public page knows how to draw (lucide names). Anything else is rejected.
FEATURE_ICONS = ['shield', 'zap', 'chart', 'users', 'workflow', 'database', 'lock', 'bell', 'globe', 'smartphone',
                 'layers', 'credit-card', 'search', 'file-text', 'settings', 'cloud', 'code', 'message']

CHILD_READONLY = ['id', 'created_at', 'updated_at']


class ProjectChildSerializer(ContentSerializer):
    """The project comes from the URL, never the body, so an item can't be moved to another project."""

    def project(self):
        return self.context['project']

    def check_same_project(self, obj, label):
        if obj is not None and obj.project_id != self.project().pk:
            raise serializers.ValidationError(f'That {label} belongs to a different project.')
        return obj


class GalleryItemSerializer(ProjectChildSerializer):
    media_asset = MediaField(allow_null=False, required=True)

    class Meta:
        model = ProjectMedia
        fields = ['id', 'media_asset', 'caption', 'alt_text', 'category', 'display_order', 'is_published', 'created_at', 'updated_at']
        read_only_fields = CHILD_READONLY

    def validate_media_asset(self, asset):
        taken = ProjectMedia.objects.filter(project=self.project(), media_asset=asset)
        if self.instance:
            taken = taken.exclude(pk=self.instance.pk)
        if taken.exists():
            raise serializers.ValidationError('That image is already in this gallery.')
        return asset


class BuildComponentSerializer(ProjectChildSerializer):
    media = MediaField()
    video = serializers.PrimaryKeyRelatedField(queryset=ProjectVideo.objects.all(), allow_null=True, required=False)

    class Meta:
        model = ProjectBuildComponent
        fields = ['id', 'title', 'summary', 'details', 'media', 'video', 'display_order', 'is_published', 'created_at', 'updated_at']
        read_only_fields = CHILD_READONLY

    def validate_video(self, value):
        return self.check_same_project(value, 'video')


class FeatureSerializer(ProjectChildSerializer):
    media = MediaField()
    icon_key = serializers.ChoiceField(choices=[''] + FEATURE_ICONS, required=False, allow_blank=True)

    class Meta:
        model = ProjectFeature
        fields = ['id', 'title', 'description', 'icon_key', 'media', 'display_order', 'is_published', 'created_at', 'updated_at']
        read_only_fields = CHILD_READONLY


class OutcomeSerializer(ProjectChildSerializer):
    class Meta:
        model = ProjectOutcome
        fields = ['id', 'label', 'metric_value', 'description', 'is_verified', 'verification_note', 'display_order',
                  'is_published', 'created_at', 'updated_at']
        read_only_fields = CHILD_READONLY

    def validate(self, attrs):
        attrs = super().validate(attrs)
        published = attrs.get('is_published', getattr(self.instance, 'is_published', False))
        verified = attrs.get('is_verified', getattr(self.instance, 'is_verified', False))
        if published and not verified:
            raise serializers.ValidationError({'is_published': 'Only verified results can be published. Confirm it is verified first.'})
        return attrs


class StackItemSerializer(ProjectChildSerializer):
    """Pick a technology from the shared list, or type a new one (`technology_name` + `technology_category`).
    A typed name reuses a matching technology, or adds it to the shared list as a draft: it then shows on this
    project only, and stays off the homepage Tech Stack until someone publishes it there."""

    technology = serializers.PrimaryKeyRelatedField(queryset=TechnologyItem.objects.all(), required=False, allow_null=True)
    technology_name = serializers.CharField(max_length=80, required=False, allow_blank=True, write_only=True)
    technology_category = serializers.CharField(max_length=80, required=False, allow_blank=True, write_only=True)
    name = serializers.CharField(source='technology.name', read_only=True)
    category = serializers.CharField(source='technology.category', read_only=True)
    icon_key = serializers.CharField(source='technology.icon_key', read_only=True)

    class Meta:
        model = ProjectTechnology
        fields = ['id', 'technology', 'technology_name', 'technology_category', 'name', 'category', 'icon_key', 'note',
                  'display_order', 'is_published', 'created_at', 'updated_at']
        read_only_fields = CHILD_READONLY

    def validate(self, attrs):
        attrs = super().validate(attrs)
        name = attrs.pop('technology_name', '').strip()
        category = attrs.pop('technology_category', '').strip() or 'Other'
        technology = attrs.get('technology')
        if technology is None and name:
            technology = TechnologyItem.objects.filter(name__iexact=name, category__iexact=category).first()
            if technology is None:
                attrs['_new_technology'] = (name, category)
        if technology is None and '_new_technology' not in attrs:
            if self.instance and 'technology' not in attrs:
                return attrs  # editing only the note
            raise serializers.ValidationError({'technology': 'Choose a technology, or type its name below.'})
        if technology is not None:
            taken = ProjectTechnology.objects.filter(project=self.project(), technology=technology)
            if self.instance:
                taken = taken.exclude(pk=self.instance.pk)
            if taken.exists():
                raise serializers.ValidationError({'technology': f'{technology.name} is already listed for this project.'})
            attrs['technology'] = technology
        return attrs

    def _resolve(self, validated_data):
        new = validated_data.pop('_new_technology', None)
        if new:
            validated_data['technology'], _ = TechnologyItem.objects.get_or_create(name=new[0], category=new[1])
        return validated_data

    def create(self, validated_data):
        return super().create(self._resolve(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._resolve(validated_data))


def file_url(request, field):
    return absolute(request, field.url) if field else ''


class VideoSerializer(ProjectChildSerializer):
    poster_media = MediaField()
    video_url = serializers.SerializerMethodField()
    captions_url = serializers.SerializerMethodField()
    embed_url = serializers.SerializerMethodField()
    source_type = serializers.ChoiceField(choices=ProjectVideo.Source.choices, default=ProjectVideo.Source.UPLOAD)

    class Meta:
        model = ProjectVideo
        fields = ['id', 'title', 'description', 'source_type', 'external_url', 'external_id', 'embed_url', 'video_url',
                  'poster_media', 'captions_url', 'captions_language', 'captions_label', 'is_primary', 'is_published',
                  'display_order', 'processing_status', 'failure_reason', 'mime_type', 'file_size_bytes',
                  'duration_seconds', 'width', 'height', 'video_codec', 'audio_codec', 'created_at', 'updated_at']
        read_only_fields = CHILD_READONLY + ['external_id', 'processing_status', 'failure_reason', 'mime_type',
                                             'file_size_bytes', 'duration_seconds', 'width', 'height', 'video_codec', 'audio_codec']

    def get_video_url(self, obj):
        return file_url(self.context.get('request'), obj.video_file)

    def get_captions_url(self, obj):
        return file_url(self.context.get('request'), obj.captions_file)

    def get_embed_url(self, obj):
        return video_rules.embed_url(obj.source_type, obj.external_id) if obj.external_id else ''

    def validate_captions_language(self, value):
        if not value or len(value) > 12 or not all(part.isalnum() for part in value.split('-')):
            raise serializers.ValidationError('Use a language code such as "en" or "en-IN".')
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        source = attrs.get('source_type', getattr(self.instance, 'source_type', ProjectVideo.Source.UPLOAD))
        if self.instance and 'source_type' in attrs and attrs['source_type'] != self.instance.source_type:
            raise serializers.ValidationError({'source_type': 'The source type cannot change. Add a new video instead.'})
        if source == ProjectVideo.Source.UPLOAD:
            if attrs.get('external_url'):
                raise serializers.ValidationError({'external_url': 'Uploaded videos do not use a link.'})
        elif 'external_url' in attrs or not self.instance:
            try:
                provider, video_id = video_rules.parse_external(attrs.get('external_url', ''))
            except serializers.ValidationError as exc:
                raise serializers.ValidationError({'external_url': exc.detail}) from exc
            if provider != source:
                raise serializers.ValidationError({'external_url': f'That is a {provider.capitalize()} link; choose {provider.capitalize()} as the source.'})
            attrs['external_id'] = video_id
            attrs['processing_status'] = ProjectVideo.State.READY
            attrs['failure_reason'] = ''
        state = attrs.get('processing_status', getattr(self.instance, 'processing_status', ProjectVideo.State.AWAITING_UPLOAD))
        if attrs.get('is_published') and state != ProjectVideo.State.READY:
            raise serializers.ValidationError({'is_published': 'Upload the video file and let it pass validation before publishing.'})
        return attrs


# ---------------------------------------------------------------------------
# Public case study
# ---------------------------------------------------------------------------

def paragraphs(text):
    return [p.strip() for p in (text or '').replace('\r\n', '\n').split('\n\n') if p.strip()]


class PublicCaseStudy:
    """Builds the public payload. Only published children are included, and nothing private:
    no verification notes, storage keys, unapproved client names or private repository links."""

    def __init__(self, project, request, related):
        self.project, self.request, self.related = project, request, related

    def media(self, asset, alt=None):
        data = media_brief(asset, self.request)
        if data and alt:
            data['alt_text'] = alt
        return data

    def videos(self):
        out = []
        for v in self.project.published_videos:
            if not v.is_playable:
                continue
            item = {'id': str(v.pk), 'title': v.title, 'description': v.description, 'source_type': v.source_type,
                    'poster': self.media(v.poster_media), 'is_primary': v.is_primary,
                    'duration_seconds': v.duration_seconds, 'width': v.width, 'height': v.height}
            if v.source_type == ProjectVideo.Source.UPLOAD:
                item.update(src=file_url(self.request, v.video_file), mime_type=v.mime_type or 'video/mp4',
                            captions=({'src': file_url(self.request, v.captions_file), 'language': v.captions_language,
                                       'label': v.captions_label} if v.captions_file else None))
            else:
                item.update(embed_url=video_rules.embed_url(v.source_type, v.external_id))
            out.append(item)
        return out

    def story(self):
        p = self.project
        blocks = [('challenge', 'The Challenge', p.problem_statement, p.problem_media),
                  ('approach', 'The Approach', p.approach, p.approach_media),
                  ('solution', 'The Solution', p.solution, p.solution_media),
                  ('result', 'The Result', p.outcome, p.outcome_media)]
        return [{'key': key, 'title': title, 'paragraphs': paragraphs(text), 'image': self.media(media)}
                for key, title, text, media in blocks if (text or '').strip()]

    def data(self):
        p = self.project
        playable = self.videos()
        videos_by_id = {v['id']: v for v in playable}
        return {
            'slug': p.slug,
            'title': p.title,
            'category': p.category,
            'status_label': p.status_label,
            'is_featured': p.is_featured,
            'short_description': p.short_description,
            'description': p.description,
            'overview': paragraphs(p.overview),
            'audience': p.audience,
            'technologies': p.technologies,
            'client_name': p.client_name if p.show_client_name else '',
            'project_role': p.project_role,
            'project_duration': p.project_duration,
            'project_url': p.project_url,
            'repository_url': p.repository_url if p.repository_public else '',
            'started_at': p.started_at,
            'completed_at': p.completed_at,
            'cover': self.media(p.cover_media),
            'hero': self.media(p.hero_media or p.cover_media),
            'seo': {'title': p.seo_title or p.title, 'description': p.seo_description or p.short_description or p.description[:180],
                    'image': self.media(p.hero_media or p.cover_media)},
            'build_components': [
                {'id': str(c.pk), 'title': c.title, 'summary': c.summary, 'details': paragraphs(c.details),
                 'image': self.media(c.media), 'video': videos_by_id.get(str(c.video_id)) if c.video_id else None}
                for c in p.published_build_components],
            'gallery': [{'id': str(g.pk), **self.media(g.media_asset, g.alt_text or g.media_asset.alt_text),
                         'caption': g.caption, 'category': g.category, 'category_label': g.get_category_display() if g.category else ''}
                        for g in p.published_gallery],
            'videos': playable,
            'stack': [{'name': t.technology.name, 'category': t.technology.category, 'icon_key': t.technology.icon_key,
                       'note': t.note or t.technology.description} for t in p.published_stack],
            'story': self.story(),
            'features': [{'id': str(f.pk), 'title': f.title, 'description': f.description, 'icon_key': f.icon_key,
                          'image': self.media(f.media)} for f in p.published_features],
            'outcomes': [{'id': str(o.pk), 'label': o.label, 'metric_value': o.metric_value, 'description': o.description}
                         for o in p.published_outcomes if o.is_verified],
            'related': [{'slug': r.slug, 'title': r.title, 'category': r.category, 'short_description': r.short_description,
                         'cover': self.media(r.thumbnail_media or r.cover_media)} for r in self.related],
        }

