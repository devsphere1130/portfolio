"""Case studies: public visibility rules, nested admin endpoints, video validation and storage."""

import os
import struct
from unittest import mock

from django.conf import settings
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.tests import make_user, signed_in

from . import video as video_rules
from .models import MediaAsset, Project, ProjectMedia, ProjectOutcome, ProjectStatus, ProjectVideo, TechnologyItem
from .tests import png_bytes, upload


# ---------------------------------------------------------------------------
# Synthetic MP4s: just enough ISO BMFF structure for the parser (not playable).
# ---------------------------------------------------------------------------

def box(kind, payload=b''):
    return struct.pack('>I', 8 + len(payload)) + kind + payload


def track(handler, codec, width=0, height=0):
    tkhd = box(b'tkhd', b'\0' * 76 + struct.pack('>II', width << 16, height << 16))
    hdlr = box(b'hdlr', b'\0' * 8 + handler + b'\0' * 13)
    stsd = box(b'stsd', b'\0' * 4 + struct.pack('>I', 1) + struct.pack('>I', 16) + codec + b'\0' * 8)
    return box(b'trak', tkhd + box(b'mdia', hdlr + box(b'minf', box(b'stbl', stsd))))


def mp4(video_codec=b'avc1', audio_codec=b'mp4a', seconds=12, width=1920, height=1080, brand=b'isom', moov_first=True):
    ftyp = box(b'ftyp', brand + b'\0\0\2\0' + brand + (b'' if brand == b'qt  ' else b'mp41'))
    mvhd = box(b'mvhd', b'\0' * 12 + struct.pack('>II', 1000, int(seconds * 1000)) + b'\0' * 80)
    tracks = track(b'vide', video_codec, width, height) + (track(b'soun', audio_codec) if audio_codec else b'')
    moov = box(b'moov', mvhd + tracks)
    mdat = box(b'mdat', b'\0' * 256)
    return ftyp + (moov + mdat if moov_first else mdat + moov)


def mp4_upload(data=None, name='demo.mp4'):
    return SimpleUploadedFile(name, data if data is not None else mp4(), content_type='video/mp4')


def inspect(data):
    return video_rules.inspect_mp4(lambda offset, length: data[offset:offset + length], len(data))


class VideoParserTests(TestCase):
    def test_reads_codecs_duration_and_size(self):
        facts = inspect(mp4(seconds=42.5, width=1280, height=720))
        self.assertEqual((facts['video_codec'], facts['audio_codec']), ('H.264', 'AAC'))
        self.assertEqual((facts['duration_seconds'], facts['width'], facts['height']), (42.5, 1280, 720))

    def test_index_at_the_end_and_silent_video_are_fine(self):
        facts = inspect(mp4(audio_codec=None, moov_first=False))
        self.assertEqual(facts['audio_codec'], '')

    def test_rejections(self):
        cases = {
            'not mp4': b'GIF89a' + b'\0' * 100,
            'quicktime': mp4(brand=b'qt  '),
            'hevc': mp4(video_codec=b'hvc1'),
            'bad audio': mp4(audio_codec=b'ac-3'),
            'too long': mp4(seconds=settings.VIDEO_MAX_DURATION_SECONDS + 1),
            'too big': mp4(width=7680, height=4320),
            'truncated': mp4()[:-40],
            'no media data': mp4()[:-(8 + 256)],
        }
        for label, data in cases.items():
            with self.subTest(label), self.assertRaises(video_rules.VideoError):
                inspect(data)

    def test_external_links(self):
        ok = {
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10': ('youtube', 'dQw4w9WgXcQ'),
            'https://youtu.be/dQw4w9WgXcQ': ('youtube', 'dQw4w9WgXcQ'),
            'https://www.youtube.com/shorts/dQw4w9WgXcQ': ('youtube', 'dQw4w9WgXcQ'),
            'https://vimeo.com/76979871': ('vimeo', '76979871'),
        }
        for url, expected in ok.items():
            self.assertEqual(video_rules.parse_external(url), expected)
        for bad in ['http://youtu.be/dQw4w9WgXcQ', 'https://evil.example/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)',
                    'https://www.youtube.com/watch?v=<script>', 'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ']:
            with self.subTest(bad), self.assertRaises(Exception):
                video_rules.parse_external(bad)


class CaseStudyBase(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user()
        self.client = signed_in(self.admin)
        self.project = Project.objects.create(title='Clinic Portal', slug='clinic-portal', category='Healthcare',
                                              status=ProjectStatus.PUBLISHED, overview='First paragraph.\n\nSecond paragraph.')

    def url(self, kind, *rest, project=None):
        project = project or self.project
        tail = ''.join(f'{part}/' for part in rest)
        return f'/api/admin/projects/{project.pk}/{kind}/{tail}'

    def public(self, slug='clinic-portal', client=None, preview=False):
        return (client or APIClient()).get(f'/api/public/projects/{slug}/', {'preview': '1'} if preview else {})

    def asset(self):
        response = upload(self.client, png_bytes())
        self.assertEqual(response.status_code, 201, response.data)
        return response.data['id']

    def upload_video(self, data=None, title='Walkthrough'):
        video = self.client.post(self.url('videos'), {'title': title}, format='json')
        self.assertEqual(video.status_code, 201, video.data)
        started = self.client.post(self.url('videos', video.data['id'], 'upload'))
        self.assertEqual(started.data['mode'], 'server')
        return video.data['id'], self.client.post(self.url('videos', video.data['id'], 'file'), {'file': mp4_upload(data)}, format='multipart')


@override_settings(MEDIA_ROOT=settings.MEDIA_ROOT)
class PublicCaseStudyTests(CaseStudyBase):
    def test_draft_and_archived_projects_are_private(self):
        for state in (ProjectStatus.DRAFT, ProjectStatus.ARCHIVED):
            Project.objects.filter(pk=self.project.pk).update(status=state)
            self.assertEqual(self.public().status_code, 404)
            self.assertNotIn('clinic-portal', [p['slug'] for p in APIClient().get('/api/public/projects/').data])
        # Staff can preview drafts, but archived projects stay out even in preview.
        Project.objects.filter(pk=self.project.pk).update(status=ProjectStatus.DRAFT)
        self.assertEqual(self.public(client=self.client, preview=True).status_code, 200)
        self.assertEqual(self.public(preview=True).status_code, 404)  # anonymous ?preview=1 is ignored

    def test_empty_sections_are_empty_and_private_fields_hidden(self):
        Project.objects.filter(pk=self.project.pk).update(client_name='Acme Hospital', repository_url='https://github.com/x/y')
        data = self.public().data
        for key in ('gallery', 'videos', 'build_components', 'features', 'outcomes', 'stack', 'related'):
            self.assertEqual(data[key], [], key)
        self.assertEqual(data['overview'], ['First paragraph.', 'Second paragraph.'])
        self.assertEqual((data['client_name'], data['repository_url']), ('', ''))
        Project.objects.filter(pk=self.project.pk).update(show_client_name=True, repository_public=True)
        data = self.public().data
        self.assertEqual((data['client_name'], data['repository_url']), ('Acme Hospital', 'https://github.com/x/y'))

    def test_only_published_children_are_public(self):
        asset = self.asset()
        image = self.client.post(self.url('gallery'), {'media_asset': asset, 'caption': 'Dashboard', 'category': 'dashboard'}, format='json')
        self.assertEqual(image.status_code, 201, image.data)
        self.client.post(self.url('features'), {'title': 'Audit trail', 'description': 'Every change is logged.', 'icon_key': 'shield'}, format='json')
        hidden = self.client.post(self.url('features'), {'title': 'Secret', 'is_published': False}, format='json')
        self.assertEqual(hidden.status_code, 201)
        data = self.public().data
        self.assertEqual([g['caption'] for g in data['gallery']], ['Dashboard'])
        self.assertEqual(data['gallery'][0]['category_label'], 'Dashboard')
        self.assertEqual([f['title'] for f in data['features']], ['Audit trail'])
        self.client.patch(self.url('gallery', image.data['id']), {'is_published': False}, format='json')
        self.assertEqual(self.public().data['gallery'], [])

    def test_outcomes_need_verification_and_notes_stay_private(self):
        created = self.client.post(self.url('outcomes'), {'label': 'Manual work', 'metric_value': '40%', 'is_published': True}, format='json')
        self.assertEqual(created.status_code, 400)
        self.assertIn('is_published', created.data)
        created = self.client.post(self.url('outcomes'), {'label': 'Manual work', 'metric_value': '40%', 'is_verified': True,
                                                          'verification_note': 'Ops report, March', 'is_published': True}, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        outcome = self.public().data['outcomes'][0]
        self.assertEqual(outcome['metric_value'], '40%')
        self.assertNotIn('verification_note', outcome)
        self.assertNotIn('Ops report', str(self.public().data))

    def test_stack_comes_from_the_shared_technology_list(self):
        tech = TechnologyItem.objects.create(name='Django', category='Backend')
        self.assertEqual(self.client.post(self.url('stack'), {'technology': tech.pk, 'note': 'REST API'}, format='json').status_code, 201)
        self.assertEqual(self.client.post(self.url('stack'), {'technology': tech.pk}, format='json').status_code, 400)  # duplicate
        self.assertEqual(self.public().data['stack'], [{'name': 'Django', 'category': 'Backend', 'icon_key': '', 'note': 'REST API'}])

    def test_stack_entry_can_be_typed_in(self):
        typed = self.client.post(self.url('stack'), {'technology_name': 'Tailwind CSS', 'technology_category': 'Frontend', 'note': 'Styling'}, format='json')
        self.assertEqual(typed.status_code, 201, typed.data)
        tech = TechnologyItem.objects.get(name='Tailwind CSS')
        self.assertEqual((tech.category, tech.status), ('Frontend', 'draft'))  # off the homepage stack until published there
        again = self.client.post(self.url('stack'), {'technology_name': 'tailwind css', 'technology_category': 'frontend'}, format='json')
        self.assertEqual(again.status_code, 400)  # matched the same technology, already listed
        self.assertEqual(TechnologyItem.objects.filter(name__iexact='tailwind css').count(), 1)
        self.assertEqual(self.client.post(self.url('stack'), {'note': 'nothing chosen'}, format='json').status_code, 400)
        self.assertEqual(self.public().data['stack'][0]['name'], 'Tailwind CSS')
        self.assertNotIn('Tailwind CSS', [t['name'] for t in APIClient().get('/api/public/technologies/').data])

    def test_related_projects(self):
        other = Project.objects.create(title='Lab Results', slug='lab-results', category='Healthcare', status=ProjectStatus.PUBLISHED)
        Project.objects.create(title='Draft', slug='draft-one', category='Healthcare')
        self.assertEqual([r['slug'] for r in self.public().data['related']], ['lab-results'])  # same category, published only
        chosen = Project.objects.create(title='Billing', slug='billing', category='Fintech', status=ProjectStatus.PUBLISHED)
        response = self.client.patch(f'/api/admin/projects/{self.project.pk}/', {'related_projects': [str(chosen.pk)]}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([r['slug'] for r in self.public().data['related']], ['billing'])
        self_ref = self.client.patch(f'/api/admin/projects/{self.project.pk}/', {'related_projects': [str(self.project.pk)]}, format='json')
        self.assertEqual(self_ref.status_code, 400)
        self.assertIsNotNone(other)

    def test_share_page_for_link_previews(self):
        Project.objects.filter(pk=self.project.pk).update(seo_title='Clinic <Portal>', seo_description='Bookings "fast"')
        page = APIClient().get('/api/public/share/work/clinic-portal/')
        self.assertEqual(page.status_code, 200)
        html = page.content.decode()
        self.assertIn('<meta property="og:title" content="Clinic &lt;Portal&gt;">', html)
        self.assertIn('content="Bookings &quot;fast&quot;"', html)
        self.assertIn('/work/clinic-portal', html)
        Project.objects.filter(pk=self.project.pk).update(status=ProjectStatus.DRAFT)
        self.assertEqual(APIClient().get('/api/public/share/work/clinic-portal/').status_code, 404)


class AdminScopingTests(CaseStudyBase):
    def test_child_endpoints_require_dashboard_login(self):
        for kind in ('gallery', 'videos', 'build-components', 'features', 'outcomes', 'stack'):
            self.assertEqual(APIClient().get(self.url(kind)).status_code, 403, kind)
            self.assertEqual(APIClient().post(self.url(kind), {}, format='json').status_code, 403, kind)

    def test_items_cannot_be_reached_through_another_project(self):
        other = Project.objects.create(title='Other', slug='other')
        feature = self.client.post(self.url('features'), {'title': 'Mine'}, format='json').data
        self.assertEqual(self.client.get(self.url('features', feature['id'], project=other)).status_code, 404)
        self.assertEqual(self.client.patch(self.url('features', feature['id'], project=other), {'title': 'Taken'}, format='json').status_code, 404)
        self.assertEqual(self.client.delete(self.url('features', feature['id'], project=other)).status_code, 404)
        reorder = self.client.post(self.url('features', 'reorder', project=other), {'ids': [feature['id']]}, format='json')
        self.assertEqual(reorder.status_code, 400)
        # The project in the body is ignored: items always belong to the project in the URL.
        moved = self.client.post(self.url('features', project=other), {'title': 'Body says mine', 'project': str(self.project.pk)}, format='json')
        self.assertEqual(Project.objects.get(features__id=moved.data['id']), other)

    def test_build_component_video_must_be_from_the_same_project(self):
        other = Project.objects.create(title='Other', slug='other')
        foreign = ProjectVideo.objects.create(project=other, title='Theirs')
        response = self.client.post(self.url('build-components'), {'title': 'API', 'summary': 'REST API', 'video': str(foreign.pk)}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_gallery_reorder_duplicates_and_bulk_delete(self):
        ids = [self.client.post(self.url('gallery'), {'media_asset': self.asset()}, format='json').data['id'] for _ in range(3)]
        first = ProjectMedia.objects.get(pk=ids[0])
        dup = self.client.post(self.url('gallery'), {'media_asset': str(first.media_asset_id)}, format='json')
        self.assertEqual(dup.status_code, 400)
        reordered = self.client.post(self.url('gallery', 'reorder'), {'ids': list(reversed(ids))}, format='json')
        self.assertEqual([row['id'] for row in reordered.data], list(reversed(ids)))
        removed = self.client.post(self.url('gallery', 'bulk-delete'), {'ids': ids[:2]}, format='json')
        self.assertEqual(removed.data, {'removed': 2})
        self.assertEqual(ProjectMedia.objects.filter(project=self.project).count(), 1)
        self.assertEqual(MediaAsset.objects.count(), 3)  # images stay in the media library

    def test_editing_one_field_does_not_undo_a_concurrent_reorder(self):
        from .project_serializers import GalleryItemSerializer
        item = ProjectMedia.objects.create(project=self.project, media_asset_id=self.asset(), display_order=2)
        stale = ProjectMedia.objects.get(pk=item.pk)
        ProjectMedia.objects.filter(pk=item.pk).update(display_order=1)  # a reorder lands meanwhile
        serializer = GalleryItemSerializer(stale, data={'caption': 'New caption'}, partial=True, context={'project': self.project})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        fresh = ProjectMedia.objects.get(pk=item.pk)
        self.assertEqual((fresh.caption, fresh.display_order), ('New caption', 1))

    def test_media_used_by_a_case_study_cannot_be_deleted(self):
        asset = self.asset()
        self.client.post(self.url('features'), {'title': 'Reports', 'media': asset}, format='json')
        self.assertEqual(self.client.delete(f'/api/admin/media/{asset}/').status_code, 409)

    def test_archive(self):
        response = self.client.post(f'/api/admin/projects/{self.project.pk}/archive/')
        self.assertEqual(response.data['status'], 'archived')
        self.assertEqual(self.client.get('/api/admin/projects/', {'status': 'archived'}).data['count'], 1)


@override_settings(MEDIA_ROOT=settings.MEDIA_ROOT)
class VideoTests(CaseStudyBase):
    def test_upload_validate_publish_and_show(self):
        video_id, response = self.upload_video()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual((response.data['processing_status'], response.data['video_codec'], response.data['width']), ('ready', 'H.264', 1920))
        self.assertTrue(response.data['is_primary'])  # the first video is the primary one
        self.assertEqual(self.public().data['videos'], [])  # not published yet
        self.assertEqual(self.client.post(self.url('videos', video_id, 'publish')).status_code, 200)
        public = self.public().data['videos']
        self.assertEqual(len(public), 1)
        self.assertTrue(public[0]['src'].endswith('.mp4'))
        self.assertNotIn('pending_key', public[0])
        self.client.post(self.url('videos', video_id, 'unpublish'))
        self.assertEqual(self.public().data['videos'], [])

    def test_cannot_publish_before_a_valid_file(self):
        video = self.client.post(self.url('videos'), {'title': 'Demo'}, format='json').data
        self.assertEqual(self.client.post(self.url('videos', video['id'], 'publish')).status_code, 400)
        self.assertEqual(self.client.patch(self.url('videos', video['id']), {'is_published': True}, format='json').status_code, 400)
        bad = self.client.post(self.url('videos', video['id'], 'file'), {'file': mp4_upload(mp4(video_codec=b'hvc1'))}, format='multipart')
        self.assertEqual(bad.status_code, 400)
        self.assertIn('H.264', bad.data['file'][0])
        stored = ProjectVideo.objects.get(pk=video['id'])
        self.assertEqual((stored.processing_status, bool(stored.video_file)), ('failed', False))
        self.assertEqual(self.public().data['videos'], [])

    def test_failed_replacement_keeps_the_working_file_and_success_deletes_the_old_one(self):
        video_id, _ = self.upload_video()
        self.client.post(self.url('videos', video_id, 'publish'))
        old_path = ProjectVideo.objects.get(pk=video_id).video_file.path
        bad = self.client.post(self.url('videos', video_id, 'file'), {'file': mp4_upload(b'not a video at all' * 4)}, format='multipart')
        self.assertEqual(bad.status_code, 400)
        kept = ProjectVideo.objects.get(pk=video_id)
        self.assertEqual((kept.processing_status, kept.is_published, kept.video_file.path), ('ready', True, old_path))
        with self.captureOnCommitCallbacks(execute=True):
            good = self.client.post(self.url('videos', video_id, 'file'), {'file': mp4_upload(mp4(seconds=5))}, format='multipart')
        self.assertEqual(good.data['duration_seconds'], 5)
        self.assertFalse(os.path.exists(old_path))
        self.assertTrue(os.path.exists(ProjectVideo.objects.get(pk=video_id).video_file.path))

    def test_deleting_a_video_or_its_project_removes_the_files(self):
        video_id, _ = self.upload_video()
        path = ProjectVideo.objects.get(pk=video_id).video_file.path
        with self.captureOnCommitCallbacks(execute=True):
            self.client.delete(self.url('videos', video_id))
        self.assertFalse(os.path.exists(path))
        video_id, _ = self.upload_video()
        path = ProjectVideo.objects.get(pk=video_id).video_file.path
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.client.delete(f'/api/admin/projects/{self.project.pk}/').status_code, 204)
        self.assertFalse(os.path.exists(path))

    def test_one_primary_video(self):
        first, _ = self.upload_video(title='One')
        second, _ = self.upload_video(title='Two')
        self.client.patch(self.url('videos', second), {'is_primary': True}, format='json')
        primaries = list(ProjectVideo.objects.filter(project=self.project, is_primary=True).values_list('pk', flat=True))
        self.assertEqual([str(p) for p in primaries], [second])
        self.assertNotEqual(first, second)

    def test_external_video(self):
        bad = self.client.post(self.url('videos'), {'title': 'Demo', 'source_type': 'youtube', 'external_url': 'https://evil.example/v'}, format='json')
        self.assertEqual(bad.status_code, 400)
        mismatch = self.client.post(self.url('videos'), {'title': 'Demo', 'source_type': 'vimeo', 'external_url': 'https://youtu.be/dQw4w9WgXcQ'}, format='json')
        self.assertEqual(mismatch.status_code, 400)
        made = self.client.post(self.url('videos'), {'title': 'Demo', 'source_type': 'youtube', 'external_url': 'https://youtu.be/dQw4w9WgXcQ', 'is_published': True}, format='json')
        self.assertEqual(made.status_code, 201, made.data)
        public = self.public().data['videos'][0]
        self.assertEqual(public['embed_url'], 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1')
        self.assertNotIn('src', public)
        self.assertEqual(self.client.post(self.url('videos', made.data['id'], 'upload')).status_code, 400)

    @override_settings(VIDEO_EXTERNAL_PROVIDERS='')
    def test_external_links_can_be_disabled(self):
        made = self.client.post(self.url('videos'), {'title': 'Demo', 'source_type': 'youtube', 'external_url': 'https://youtu.be/dQw4w9WgXcQ'}, format='json')
        self.assertEqual(made.status_code, 400)

    def test_captions(self):
        video_id, _ = self.upload_video()
        bad = self.client.post(self.url('videos', video_id, 'captions'), {'file': SimpleUploadedFile('c.vtt', b'<script>x</script>')}, format='multipart')
        self.assertEqual(bad.status_code, 400)
        vtt = b'WEBVTT\n\n00:00.000 --> 00:02.000\nHello\n'
        good = self.client.post(self.url('videos', video_id, 'captions'), {'file': SimpleUploadedFile('c.vtt', vtt)}, format='multipart')
        self.assertEqual(good.status_code, 200, good.data)
        self.assertTrue(good.data['captions_url'].endswith('.vtt'))
        self.client.post(self.url('videos', video_id, 'publish'))
        self.assertEqual(self.public().data['videos'][0]['captions']['language'], 'en')
        self.assertEqual(self.client.delete(self.url('videos', video_id, 'captions')).data['captions_url'], '')

    @override_settings(VIDEO_MAX_UPLOAD_MB=0)
    def test_size_limit(self):
        _, response = self.upload_video()
        self.assertEqual(response.status_code, 400)
        self.assertIn('MB or smaller', response.data['file'][0])


class DirectUploadTests(CaseStudyBase):
    """With S3, the browser uploads to the bucket using a signed form; the server then verifies the object."""

    def fake_storage(self, data):
        client = mock.Mock()
        client.generate_presigned_post.return_value = {'url': 'https://bucket.example/', 'fields': {'key': 'k', 'policy': 'p'}}
        client.head_object.return_value = {'ContentLength': len(data)}

        def get_object(Bucket, Key, Range):
            start, end = (int(x) for x in Range.removeprefix('bytes=').split('-'))
            return {'Body': mock.Mock(read=lambda: data[start:end + 1])}

        client.get_object.side_effect = get_object
        storage = mock.Mock(bucket_name='bucket')
        storage.connection.meta.client = client
        storage._normalize_name.side_effect = lambda name: f'media-prefix/{name}'
        return storage, client

    def run_flow(self, data):
        storage, client = self.fake_storage(data)
        video = self.client.post(self.url('videos'), {'title': 'Demo'}, format='json').data
        with override_settings(MEDIA_STORAGE='s3'), mock.patch('cms.project_views.default_storage', storage):
            started = self.client.post(self.url('videos', video['id'], 'upload'))
            done = self.client.post(self.url('videos', video['id'], 'complete'))
        return started, done, storage, client

    def test_signed_form_is_restricted(self):
        started, done, _, client = self.run_flow(mp4())
        self.assertEqual(started.data['mode'], 'direct')
        kwargs = client.generate_presigned_post.call_args.kwargs
        self.assertIn(['content-length-range', 32, settings.VIDEO_MAX_UPLOAD_MB * 1024 * 1024], kwargs['Conditions'])
        self.assertIn({'Content-Type': 'video/mp4'}, kwargs['Conditions'])
        self.assertEqual(kwargs['ExpiresIn'], settings.VIDEO_DIRECT_UPLOAD_EXPIRY_SECONDS)
        self.assertTrue(kwargs['Key'].startswith('media-prefix/videos/'))
        self.assertEqual(done.status_code, 200, done.data)
        self.assertEqual(done.data['processing_status'], 'ready')
        self.assertEqual(ProjectVideo.objects.get().pending_key, '')

    def test_invalid_object_is_deleted(self):
        started, done, storage, _ = self.run_flow(b'\0' * 200)
        self.assertEqual(done.status_code, 400)
        storage.delete.assert_called()
        self.assertEqual(ProjectVideo.objects.get().processing_status, 'failed')

    def test_outcome_constraint_in_database(self):
        # Belt and braces: even bypassing the API, an unverified outcome can't be published.
        from django.db import IntegrityError, transaction
        with self.assertRaises(IntegrityError), transaction.atomic():
            ProjectOutcome.objects.create(project=self.project, label='x', is_published=True, is_verified=False)
