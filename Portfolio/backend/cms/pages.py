"""Page publishing: sections are a working copy until `publish_page` freezes them into a snapshot."""

from django.db import transaction
from django.utils import timezone

from .models import MediaAsset, Page, Status
from .serializers import media_brief


def _section_payload(section):
    return {
        'key': section.section_key,
        'title': section.title,
        'subtitle': section.subtitle,
        'description': section.description,
        'content': section.content,
        'image_media_id': str(section.image_media_id) if section.image_media_id else None,
    }


def working_copy(page):
    return {
        'slug': page.slug,
        'title': page.title,
        'meta_title': page.meta_title,
        'meta_description': page.meta_description,
        'sections': [_section_payload(s) for s in page.sections.filter(is_enabled=True).order_by('display_order')],
    }


def render(payload, request):
    """Resolve stored image ids to current media URLs at serve time (snapshots keep ids, not URLs)."""
    ids = [s['image_media_id'] for s in payload['sections'] if s.get('image_media_id')]
    assets = {str(a.pk): a for a in MediaAsset.objects.filter(pk__in=ids)}
    sections = {}
    for section in payload['sections']:
        data = {k: v for k, v in section.items() if k not in ('image_media_id', 'key')}
        data['image'] = media_brief(assets.get(section.get('image_media_id')), request)
        sections[section['key']] = data
    return {k: v for k, v in payload.items() if k != 'sections'} | {'sections': sections}


@transaction.atomic
def publish_page(page, user):
    page = Page.objects.select_for_update().get(pk=page.pk)
    page.published_snapshot = working_copy(page)
    page.status = Status.PUBLISHED
    page.published_at = timezone.now()
    page.updated_by = user
    page.save(update_fields=['published_snapshot', 'status', 'published_at', 'updated_by', 'updated_at'])
    return page


def unpublish_page(page, user):
    page.status = Status.DRAFT
    page.updated_by = user
    page.save(update_fields=['status', 'updated_by', 'updated_at'])
    return page
