"""
Video validation. Uploaded files are never trusted by name or declared type: the MP4 container is
read box by box (ISO BMFF) to prove it is an MP4, find the codecs, duration and resolution, and reject
anything a browser can't play or that is over the configured limits. Nothing is transcoded, so editors
upload H.264/AAC MP4 (the format every browser plays).

External videos are limited to YouTube and Vimeo links. Only the video id is kept; the embed URL is
built here, so no editor-supplied URL or HTML ever reaches an <iframe>.
"""

import re
import struct
from urllib.parse import parse_qs, urlparse

from django.conf import settings
from rest_framework import serializers

VIDEO_CODECS = {'avc1': 'H.264', 'avc3': 'H.264', 'av01': 'AV1', 'vp09': 'VP9'}
AUDIO_CODECS = {'mp4a': 'AAC', 'Opus': 'Opus'}
UNSUPPORTED_VIDEO = {'hvc1': 'HEVC (H.265)', 'hev1': 'HEVC (H.265)', 'mp4v': 'MPEG-4 Part 2', 'jpeg': 'Motion JPEG'}
MP4_BRANDS = {b'isom', b'iso2', b'iso3', b'iso4', b'iso5', b'iso6', b'iso8', b'iso9', b'mp41', b'mp42', b'avc1',
              b'M4V ', b'M4VH', b'M4VP', b'dash', b'mmp4', b'MSNV', b'cmfc', b'av01', b'3gp4', b'3gp5', b'3gp6'}
MAX_MOOV_BYTES = 32 * 1024 * 1024
CONTAINERS = {b'moov', b'trak', b'mdia', b'minf', b'stbl', b'mvex', b'edts'}


class VideoError(ValueError):
    """A file that fails validation. The message is safe to show to the editor."""


def max_upload_bytes():
    return settings.VIDEO_MAX_UPLOAD_MB * 1024 * 1024


def _boxes(read_at, start, end, limit=20000):
    """Yield (type, payload_offset, payload_size) for each box between start and end."""
    offset, count = start, 0
    while offset + 8 <= end:
        count += 1
        if count > limit:
            raise VideoError('That file has an unexpected structure.')
        header = read_at(offset, 16)
        if len(header) < 8:
            break
        size, kind = struct.unpack('>I4s', header[:8])
        header_len = 8
        if size == 1:
            if len(header) < 16:
                raise VideoError('That file is truncated.')
            size = struct.unpack('>Q', header[8:16])[0]
            header_len = 16
        elif size == 0:
            size = end - offset
        if size < header_len or offset + size > end:
            raise VideoError('That file is truncated or damaged.')
        yield kind, offset + header_len, size - header_len
        offset += size


def _walk_moov(data):
    """Parse the moov box (already in memory) into duration and per-track facts."""
    view = memoryview(data)
    info = {'timescale': 0, 'duration': 0, 'fragment_duration': 0, 'tracks': []}

    def read(offset, n):
        return bytes(view[offset:offset + n])

    def visit(start, end, track):
        for kind, at, size in _boxes(read, start, end):
            payload = view[at:at + size]
            if kind == b'mvhd' and len(payload) >= 32:
                if payload[0] == 1:
                    info['timescale'], info['duration'] = struct.unpack('>IQ', bytes(payload[20:32]))
                else:
                    info['timescale'], info['duration'] = struct.unpack('>II', bytes(payload[12:20]))
            elif kind == b'mehd' and len(payload) >= 8:
                info['fragment_duration'] = struct.unpack('>Q', bytes(payload[4:12]))[0] if payload[0] == 1 else struct.unpack('>I', bytes(payload[4:8]))[0]
            elif kind == b'trak':
                child = {'handler': None, 'codec': None, 'width': 0, 'height': 0}
                info['tracks'].append(child)
                visit(at, at + size, child)
            elif kind == b'tkhd' and track is not None and len(payload) >= 8:
                width, height = struct.unpack('>II', bytes(payload[-8:]))
                track['width'], track['height'] = width >> 16, height >> 16
            elif kind == b'hdlr' and track is not None and len(payload) >= 12:
                track['handler'] = bytes(payload[8:12])
            elif kind == b'stsd' and track is not None and len(payload) >= 16:
                track['codec'] = bytes(payload[12:16]).decode('latin-1')
            elif kind in CONTAINERS:
                visit(at, at + size, track)

    visit(0, len(data), None)
    return info


def inspect_mp4(read_at, size):
    """
    Validate an MP4 given a `read_at(offset, length) -> bytes` reader (a local file or ranged reads from
    object storage). Returns the facts to store; raises VideoError with an editor-facing message.
    """
    if size < 32:
        raise VideoError('That file is empty or too small to be a video.')
    if size > max_upload_bytes():
        raise VideoError(f'Videos must be {settings.VIDEO_MAX_UPLOAD_MB} MB or smaller.')
    head = read_at(0, 64)
    if len(head) < 16 or head[4:8] != b'ftyp':
        raise VideoError('That file is not an MP4 video. Export it as MP4 (H.264 video, AAC audio).')
    ftyp_size = struct.unpack('>I', head[:4])[0]
    brands = read_at(8, min(max(ftyp_size - 8, 8), 256))
    brand_list = {brands[0:4]} | {brands[i:i + 4] for i in range(8, len(brands) - 3, 4)}
    if not brand_list & MP4_BRANDS:
        raise VideoError('That file is a QuickTime or other container, not MP4. Export it as MP4 (H.264 video, AAC audio).')

    moov = None
    has_media_data = False
    for kind, at, box_size in _boxes(read_at, 0, size):
        if kind == b'moov':
            if box_size > MAX_MOOV_BYTES:
                raise VideoError('That file has an unusually large index; re-export it.')
            moov = read_at(at, box_size)
        elif kind == b'mdat' and box_size > 0:
            has_media_data = True
        if moov is not None and has_media_data:
            break  # stop early: with object storage every box header is a ranged request
    if moov is None or not has_media_data:
        raise VideoError('That file has no playable video data. Re-export it as MP4.')

    info = _walk_moov(moov)
    video = next((t for t in info['tracks'] if t['handler'] == b'vide'), None)
    audio = next((t for t in info['tracks'] if t['handler'] == b'soun'), None)
    if video is None or not video['codec']:
        raise VideoError('That file has no video track.')
    if video['codec'] not in VIDEO_CODECS:
        name = UNSUPPORTED_VIDEO.get(video['codec'], f'“{video["codec"]}”')
        raise VideoError(f'{name} video does not play in most browsers. Export it as H.264.')
    if audio is not None and audio['codec'] not in AUDIO_CODECS:
        raise VideoError(f'The audio track (“{audio["codec"]}”) is not browser-compatible. Use AAC audio, or remove the audio.')

    units = info['duration'] or info['fragment_duration']
    duration = round(units / info['timescale'], 2) if info['timescale'] and units else None
    if duration and duration > settings.VIDEO_MAX_DURATION_SECONDS:
        raise VideoError(f'Videos can be at most {settings.VIDEO_MAX_DURATION_SECONDS // 60} minutes long.')
    width, height = video['width'], video['height']
    if width > settings.VIDEO_MAX_WIDTH or height > settings.VIDEO_MAX_HEIGHT:
        raise VideoError(f'Videos can be at most {settings.VIDEO_MAX_WIDTH}×{settings.VIDEO_MAX_HEIGHT} pixels.')
    return {
        'mime_type': 'video/mp4',
        'file_size_bytes': size,
        'duration_seconds': duration,
        'width': width or None,
        'height': height or None,
        'video_codec': VIDEO_CODECS[video['codec']],
        'audio_codec': AUDIO_CODECS.get(audio['codec'], '') if audio else '',
    }


def file_reader(fileobj):
    def read_at(offset, length):
        fileobj.seek(offset)
        return fileobj.read(length)
    return read_at


def inspect_upload(upload):
    """Validate an uploaded (multipart) file."""
    if upload.size > max_upload_bytes():
        raise VideoError(f'Videos must be {settings.VIDEO_MAX_UPLOAD_MB} MB or smaller.')
    try:
        return inspect_mp4(file_reader(upload), upload.size)
    finally:
        upload.seek(0)


# ---------------------------------------------------------------------------
# External providers
# ---------------------------------------------------------------------------

YOUTUBE_ID = re.compile(r'^[A-Za-z0-9_-]{11}$')
VIMEO_ID = re.compile(r'^\d{6,12}$')


def enabled_providers():
    return {p.strip().lower() for p in settings.VIDEO_EXTERNAL_PROVIDERS.split(',') if p.strip()}


def parse_external(url):
    """Return (provider, video_id) for a YouTube or Vimeo link, or raise a ValidationError."""
    parsed = urlparse((url or '').strip())
    host = (parsed.hostname or '').lower().removeprefix('www.').removeprefix('m.')
    if parsed.scheme != 'https':
        raise serializers.ValidationError('Use an https:// link.')
    provider = video_id = None
    if host in ('youtube.com', 'youtube-nocookie.com', 'music.youtube.com'):
        provider = 'youtube'
        parts = [p for p in parsed.path.split('/') if p]
        if parsed.path == '/watch':
            video_id = (parse_qs(parsed.query).get('v') or [''])[0]
        elif len(parts) >= 2 and parts[0] in ('embed', 'shorts', 'live', 'v'):
            video_id = parts[1]
    elif host == 'youtu.be':
        provider, video_id = 'youtube', parsed.path.strip('/').split('/')[0]
    elif host in ('vimeo.com', 'player.vimeo.com'):
        provider = 'vimeo'
        parts = [p for p in parsed.path.split('/') if p]
        video_id = next((p for p in parts if p.isdigit()), '')
    if provider is None:
        raise serializers.ValidationError('Only YouTube and Vimeo links are supported.')
    if provider not in enabled_providers():
        raise serializers.ValidationError(f'{provider.capitalize()} videos are turned off on this site.')
    if not video_id or not (YOUTUBE_ID if provider == 'youtube' else VIMEO_ID).match(video_id):
        raise serializers.ValidationError('That link does not point to a single video.')
    return provider, video_id


def embed_url(provider, video_id):
    if provider == 'youtube':
        return f'https://www.youtube-nocookie.com/embed/{video_id}?rel=0&modestbranding=1'
    if provider == 'vimeo':
        return f'https://player.vimeo.com/video/{video_id}?dnt=1'
    return ''


# ---------------------------------------------------------------------------
# Captions
# ---------------------------------------------------------------------------

MAX_CAPTIONS_BYTES = 512 * 1024


def validate_captions(upload):
    """WebVTT only: UTF-8 text starting with the WEBVTT signature. Returns the cleaned bytes."""
    if upload.size > MAX_CAPTIONS_BYTES:
        raise serializers.ValidationError('Caption files must be 512 KB or smaller.')
    data = upload.read()
    try:
        text = data.decode('utf-8-sig')
    except UnicodeDecodeError as exc:
        raise serializers.ValidationError('Caption files must be UTF-8 text.') from exc
    if not text.startswith('WEBVTT'):
        raise serializers.ValidationError('Upload a WebVTT (.vtt) caption file. It must start with “WEBVTT”.')
    if '\x00' in text or '-->' not in text:
        raise serializers.ValidationError('That caption file has no cues.')
    return text.replace('\r\n', '\n').encode('utf-8')
