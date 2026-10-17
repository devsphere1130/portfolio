"""
Image upload pipeline. The original bytes are never stored: each upload is decoded with Pillow
(proving it really is an image of an allowed format), auto-rotated, size-capped and re-encoded to
WebP. Re-encoding also strips EXIF/GPS metadata and anything smuggled inside the file.
"""

from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers

ALLOWED_FORMATS = {'JPEG': 'image/jpeg', 'PNG': 'image/png', 'WEBP': 'image/webp', 'AVIF': 'image/avif'}
MAX_DIMENSION = 2400
THUMB_DIMENSION = 480
MAX_PIXELS = 40_000_000  # ~40 MP; larger images are rejected before decoding (decompression bombs)

Image.MAX_IMAGE_PIXELS = MAX_PIXELS


def _encode(image, max_side, quality):
    copy = image.copy()
    copy.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    copy.save(buffer, format='WEBP', quality=quality, method=6)
    return buffer.getvalue(), copy.size


def process_image(upload):
    max_bytes = settings.MEDIA_MAX_UPLOAD_MB * 1024 * 1024
    if upload.size > max_bytes:
        raise serializers.ValidationError(f'Images must be {settings.MEDIA_MAX_UPLOAD_MB} MB or smaller.')

    data = upload.read()
    try:
        with Image.open(BytesIO(data)) as probe:
            source_format = probe.format
            probe.verify()  # structural check without decoding pixels
        if source_format not in ALLOWED_FORMATS:
            raise serializers.ValidationError('Upload a JPEG, PNG, WebP or AVIF image.')
        image = Image.open(BytesIO(data))
        if image.width * image.height > MAX_PIXELS:
            raise serializers.ValidationError('That image has too many pixels. Resize it below 40 megapixels.')
        image.load()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError) as exc:
        raise serializers.ValidationError('That file is not a valid image.') from exc

    image = ImageOps.exif_transpose(image)
    has_alpha = image.mode in ('RGBA', 'LA', 'PA') or (image.mode == 'P' and 'transparency' in image.info)
    image = image.convert('RGBA' if has_alpha else 'RGB')

    full_bytes, (width, height) = _encode(image, MAX_DIMENSION, 82)
    thumb_bytes, _ = _encode(image, THUMB_DIMENSION, 74)
    return {
        'file': ContentFile(full_bytes, name='image.webp'),
        'thumbnail': ContentFile(thumb_bytes, name='thumb.webp'),
        'mime_type': 'image/webp',
        'source_format': source_format,
        'file_size_bytes': len(full_bytes),
        'width': width,
        'height': height,
    }
