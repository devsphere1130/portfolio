"""
Validation for the JSON fields. Content is plain text only: HTML is rejected outright (React escapes
on render anyway), links must use a safe scheme, and every list and string has a size limit.
"""

import re

from rest_framework import serializers

_HTML = re.compile(r'<\s*[a-zA-Z!/?]')
_SAFE_HREF = re.compile(r'^(https?://[^\s]+|mailto:[^\s]+|tel:[+\d\s()-]+|/[^\s]*|#[\w-]*)$', re.IGNORECASE)


def plain_text(value, max_length=500, field='value'):
    if not isinstance(value, str):
        raise serializers.ValidationError(f'{field} must be text.')
    value = value.strip()
    if len(value) > max_length:
        raise serializers.ValidationError(f'{field} must be at most {max_length} characters.')
    if _HTML.search(value):
        raise serializers.ValidationError(f'{field} must be plain text (HTML is not allowed).')
    return value


def no_html(value):
    """Model-field level guard for regular CharField/TextField inputs."""
    if isinstance(value, str) and _HTML.search(value):
        raise serializers.ValidationError('HTML is not allowed; use plain text.')
    return value


def safe_href(value, field='link'):
    value = plain_text(value, 500, field)
    if value and not _SAFE_HREF.match(value):
        raise serializers.ValidationError(f'{field} must start with https://, mailto:, tel:, / or #.')
    return value


def string_list(value, max_items=30, max_length=120, field='list'):
    if not isinstance(value, list):
        raise serializers.ValidationError(f'{field} must be a list.')
    if len(value) > max_items:
        raise serializers.ValidationError(f'{field} can have at most {max_items} items.')
    cleaned = [plain_text(item, max_length, field) for item in value]
    return [item for item in cleaned if item]


def object_list(value, keys, max_items=20, max_length=300, field='list', required=()):
    if not isinstance(value, list):
        raise serializers.ValidationError(f'{field} must be a list.')
    if len(value) > max_items:
        raise serializers.ValidationError(f'{field} can have at most {max_items} items.')
    out = []
    for index, item in enumerate(value, start=1):
        if not isinstance(item, dict):
            raise serializers.ValidationError(f'{field} item {index} must be an object.')
        unknown = set(item) - set(keys)
        if unknown:
            raise serializers.ValidationError(f'{field} item {index} has unknown fields: {", ".join(sorted(unknown))}.')
        row = {}
        for key in keys:
            raw = item.get(key, '')
            row[key] = safe_href(raw, f'{field} {key}') if key in ('url', 'href') else plain_text(raw, max_length, f'{field} {key}')
        for key in required:
            if not row[key]:
                raise serializers.ValidationError(f'{field} item {index} needs a {key}.')
        out.append(row)
    return out


def steps(value):
    return object_list(value, ('label', 'text'), max_items=8, field='Steps', required=('label',))


def social_links(value):
    links = object_list(value, ('label', 'url'), max_items=12, field='Social links', required=('label', 'url'))
    for link in links:
        if not link['url'].lower().startswith('https://'):
            raise serializers.ValidationError('Social links must be full https:// URLs.')
    return links


def link(value, field='link'):
    if value in (None, ''):
        return {'label': '', 'href': ''}
    if not isinstance(value, dict) or set(value) - {'label', 'href'}:
        raise serializers.ValidationError(f'{field} must be {{"label", "href"}}.')
    return {'label': plain_text(value.get('label', ''), 60, f'{field} label'), 'href': safe_href(value.get('href', ''), f'{field} href')}


# ---------------------------------------------------------------------------
# Page section content schemas, keyed by "<page slug>.<section key>"
# ---------------------------------------------------------------------------

def _text(n):
    return lambda v, f: plain_text(v, n, f)


def _list(items, n=120):
    return lambda v, f: string_list(v, items, n, f)


_LINK = lambda v, f: link(v, f)  # noqa: E731
_STATS = lambda v, f: object_list(v, ('value', 'label'), 6, 40, f, required=('value', 'label'))  # noqa: E731
_PAIRS = lambda v, f: object_list(v, ('label', 'value'), 8, 80, f, required=('label', 'value'))  # noqa: E731

SECTION_SCHEMAS = {
    'home.hero': {
        'eyebrow': _text(80), 'brand': _text(40), 'tagline_prefix': _text(120), 'tagline_highlight': _text(60),
        'rotating_words': _list(8, 40), 'chips': _list(6, 30), 'primary_cta': _LINK, 'secondary_cta': _LINK,
        'founder_name': _text(80), 'founder_initials': _text(4), 'founder_role': _text(80), 'stats': _STATS,
        'status_items': _list(4, 60),
    },
    'home.selected-work': {'cta': _LINK},
    'home.capabilities': {},
    'home.tech-stack': {},
    'home.philosophy': {
        'eyebrow': _text(80),
        'items': lambda v, f: object_list(v, ('title', 'description'), 8, 300, f, required=('title',)),
    },
    'home.cta': {'eyebrow': _text(80), 'primary_cta': _LINK, 'secondary_cta': _LINK},
    'about.intro': {
        'eyebrow': _text(80), 'title_lines': _list(4, 60), 'studio_capabilities': _list(6, 40), 'meta': _PAIRS,
    },
    'about.team': {'eyebrow': _text(80), 'title_highlight': _text(80)},
    'about.closing': {'eyebrow': _text(80), 'title_highlight': _text(80), 'primary_cta': _LINK, 'secondary_cta': _LINK},
    'contact.intro': {'eyebrow': _text(80), 'title_highlight': _text(60), 'tagline': _text(160)},
    'contact.closing': {'cta_label': _text(60)},
    'projects.intro': {'eyebrow': _text(80)},
}


def section_content(page_slug, section_key, content):
    """Validate a section's `content` against its schema. Unknown sections may only use the base fields."""
    if content in (None, ''):
        content = {}
    if not isinstance(content, dict):
        raise serializers.ValidationError('Content must be an object.')
    schema = SECTION_SCHEMAS.get(f'{page_slug}.{section_key}', {})
    unknown = set(content) - set(schema)
    if unknown:
        raise serializers.ValidationError(f'Unknown content fields for {section_key}: {", ".join(sorted(unknown))}.')
    return {key: schema[key](value, key.replace('_', ' ').capitalize()) for key, value in content.items()}
