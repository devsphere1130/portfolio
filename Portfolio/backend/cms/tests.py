import shutil
import tempfile
from io import BytesIO

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import User
from accounts.tests import PASSWORD, make_user, signed_in
from portfolio.models import ContactInquiry

from .models import AuditLog, MediaAsset, Page, Project, Service, Status, TeamMember

MEDIA_DIR = tempfile.mkdtemp(prefix='devsphere-test-media-')


def png_bytes(size=(640, 400), color=(20, 120, 200)):
    buffer = BytesIO()
    Image.new('RGB', size, color).save(buffer, format='PNG')
    return buffer.getvalue()


def upload(client, data, name='photo.png', content_type='image/png', **extra):
    return client.post('/api/admin/media/', {'file': SimpleUploadedFile(name, data, content_type=content_type), **extra}, format='multipart')


class Base(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user()
        self.editor = make_user('editor@example.com', role=User.Role.EDITOR)


class PermissionTests(Base):
    ADMIN_ENDPOINTS = ['/api/admin/dashboard/', '/api/admin/projects/', '/api/admin/team/', '/api/admin/capabilities/',
                       '/api/admin/services/', '/api/admin/technologies/', '/api/admin/pages/', '/api/admin/media/',
                       '/api/admin/settings/', '/api/admin/inquiries/', '/api/admin/activity/', '/api/admin/users/']

    def test_anonymous_requests_are_rejected_everywhere(self):
        for url in self.ADMIN_ENDPOINTS:
            self.assertEqual(APIClient().get(url).status_code, 403, url)
        self.assertEqual(APIClient().post('/api/admin/projects/', {'title': 'x', 'slug': 'x'}, format='json').status_code, 403)

    def test_editor_manages_content_but_not_admin_areas(self):
        client = signed_in(self.editor)
        for url in ['/api/admin/projects/', '/api/admin/media/', '/api/admin/pages/', '/api/admin/dashboard/']:
            self.assertEqual(client.get(url).status_code, 200, url)
        for url in ['/api/admin/settings/', '/api/admin/inquiries/', '/api/admin/activity/', '/api/admin/users/']:
            self.assertEqual(client.get(url).status_code, 403, url)
        self.assertNotIn('inquiries', client.get('/api/admin/dashboard/').data)

    def test_public_api_has_no_write_or_private_routes(self):
        ContactInquiry.objects.create(name='A', email='a@example.com', service='saas', details='x' * 30)
        content = APIClient().get('/api/public/content/').data
        self.assertNotIn('inquiries', content)
        self.assertEqual(APIClient().post('/api/public/projects/', {}, format='json').status_code, 405)


class PublishingTests(Base):
    def setUp(self):
        super().setUp()
        self.client = signed_in(self.editor)

    def public_slugs(self, key='projects', client=None, preview=False):
        url = '/api/public/content/' + ('?preview=1' if preview else '')
        return [row['slug'] for row in (client or APIClient()).get(url).data[key]]

    def test_project_draft_is_private_until_published(self):
        created = self.client.post('/api/admin/projects/', {'title': 'Clinic Portal', 'slug': 'clinic-portal', 'technologies': ['React']}, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data['status'], 'draft')
        self.assertNotIn('clinic-portal', self.public_slugs())
        self.assertEqual(APIClient().get('/api/public/projects/clinic-portal/').status_code, 404)

        self.assertEqual(self.client.post(f"/api/admin/projects/{created.data['id']}/publish/").status_code, 200)
        self.assertIn('clinic-portal', self.public_slugs())
        self.assertEqual(APIClient().get('/api/public/projects/clinic-portal/').status_code, 200)

        self.client.post(f"/api/admin/projects/{created.data['id']}/unpublish/")
        self.assertNotIn('clinic-portal', self.public_slugs())
        self.assertTrue(AuditLog.objects.filter(action='project.published').exists())

    def test_preview_only_for_dashboard_users(self):
        Project.objects.create(title='Secret', slug='secret')
        self.assertNotIn('secret', self.public_slugs(preview=True))  # anonymous ?preview=1 is ignored
        self.assertIn('secret', self.public_slugs(client=self.client, preview=True))
        response = self.client.get('/api/public/content/?preview=1')
        self.assertEqual(response['Cache-Control'], 'private, no-store')
        public = APIClient().get('/api/public/content/')
        # Browsers revalidate every visit, so newly published content shows on the next page load.
        self.assertEqual(public['Cache-Control'], 'public, no-cache')
        self.assertIn('stale-while-revalidate', public['Vercel-CDN-Cache-Control'])

    def test_only_public_content_drops_vary_cookie(self):
        # Vercel never caches `Vary: Cookie`; public content is the same for everyone, so it goes.
        for client in (APIClient(), self.client):
            public = client.get('/api/public/content/')
            self.assertNotIn('cookie', public.get('Vary', '').lower())
            self.assertIn('origin', public['Vary'].lower())
        # Preview links (signed in or not) and dashboard APIs keep it, so they are never shared.
        for client in (APIClient(), self.client):
            self.assertIn('Cookie', client.get('/api/public/content/?preview=1')['Vary'])
        self.assertIn('Cookie', self.client.get('/api/admin/projects/')['Vary'])

    def test_page_edits_stay_private_until_published(self):
        call_command('seed_content', stdout=BytesIO() and __import__('io').StringIO())
        home = Page.objects.get(slug='home')
        hero = home.sections.get(section_key='hero')
        title = lambda c: c.get('/api/public/content/').data['pages']['home']['sections']['hero']['description']  # noqa: E731

        edit = self.client.patch(f'/api/admin/sections/{hero.pk}/', {'description': 'Brand new hero copy.'}, format='json')
        self.assertEqual(edit.status_code, 200, edit.data)
        self.assertNotEqual(title(APIClient()), 'Brand new hero copy.')
        self.assertTrue(self.client.get(f'/api/admin/pages/{home.pk}/').data['has_unpublished_changes'])
        preview = self.client.get('/api/public/content/?preview=1').data['pages']['home']['sections']['hero']['description']
        self.assertEqual(preview, 'Brand new hero copy.')

        self.assertEqual(self.client.post(f'/api/admin/pages/{home.pk}/publish/').status_code, 200)
        self.assertEqual(title(APIClient()), 'Brand new hero copy.')
        self.assertFalse(self.client.get(f'/api/admin/pages/{home.pk}/').data['has_unpublished_changes'])

    def test_unpublished_page_is_hidden(self):
        call_command('seed_content', stdout=__import__('io').StringIO())
        page = Page.objects.get(slug='about')
        self.client.post(f'/api/admin/pages/{page.pk}/unpublish/')
        self.assertNotIn('about', APIClient().get('/api/public/content/').data['pages'])
        self.assertEqual(APIClient().get('/api/public/pages/about/').status_code, 404)

    def test_reorder_changes_public_order(self):
        rows = [Service.objects.create(title=t, slug=t.lower(), status=Status.PUBLISHED, display_order=i) for i, t in enumerate('ABC')]
        self.assertEqual(self.public_slugs('services'), ['a', 'b', 'c'])
        response = self.client.post('/api/admin/services/reorder/', {'ids': [str(rows[2].pk), str(rows[0].pk), str(rows[1].pk)]}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.public_slugs('services'), ['c', 'a', 'b'])


class ValidationTests(Base):
    def setUp(self):
        super().setUp()
        self.client = signed_in(self.admin)
        call_command('seed_content', stdout=__import__('io').StringIO())

    def test_html_is_rejected_in_text_fields(self):
        response = self.client.post('/api/admin/projects/', {'title': '<script>alert(1)</script>', 'slug': 'x'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('title', response.data)

    def test_unsafe_links_and_unknown_section_fields_are_rejected(self):
        cta = Page.objects.get(slug='home').sections.get(section_key='cta')
        bad_link = {'content': {'primary_cta': {'label': 'Go', 'href': 'javascript:alert(1)'}}}
        self.assertEqual(self.client.patch(f'/api/admin/sections/{cta.pk}/', bad_link, format='json').status_code, 400)
        unknown = {'content': {'onclick': 'x'}}
        self.assertEqual(self.client.patch(f'/api/admin/sections/{cta.pk}/', unknown, format='json').status_code, 400)
        ok = {'content': {'primary_cta': {'label': 'Go', 'href': '/contact'}}}
        self.assertEqual(self.client.patch(f'/api/admin/sections/{cta.pk}/', ok, format='json').status_code, 200)

    def test_philosophy_cards_are_validated_and_publishable(self):
        section = Page.objects.get(slug='home').sections.get(section_key='philosophy')
        url = f'/api/admin/sections/{section.pk}/'
        bad_html = {'content': {'items': [{'title': '<b>x</b>', 'description': 'y'}]}}
        self.assertEqual(self.client.patch(url, bad_html, format='json').status_code, 400)
        bad_key = {'content': {'items': [{'title': 'x', 'description': 'y', 'icon': 'z'}]}}
        self.assertEqual(self.client.patch(url, bad_key, format='json').status_code, 400)
        ok = {'title': 'We solve the system.', 'content': {'eyebrow': 'Philosophy', 'items': [{'title': 'Clarity', 'description': 'Plain words.'}]}}
        self.assertEqual(self.client.patch(url, ok, format='json').status_code, 200)
        self.client.post(f'/api/admin/pages/{section.page_id}/publish/')
        live = APIClient().get('/api/public/content/').data['pages']['home']['sections']['philosophy']
        self.assertEqual((live['title'], live['content']['items'][0]['title']), ('We solve the system.', 'Clarity'))

    def test_section_key_is_immutable(self):
        hero = Page.objects.get(slug='home').sections.get(section_key='hero')
        self.assertEqual(self.client.patch(f'/api/admin/sections/{hero.pk}/', {'section_key': 'other'}, format='json').status_code, 400)

    def test_social_links_must_be_https(self):
        bad = self.client.patch('/api/admin/settings/', {'social_links': [{'label': 'GitHub', 'url': 'http://github.com/x'}]}, format='json')
        self.assertEqual(bad.status_code, 400)
        good = self.client.patch('/api/admin/settings/', {'social_links': [{'label': 'GitHub', 'url': 'https://github.com/x'}]}, format='json')
        self.assertEqual(good.status_code, 200)
        self.assertEqual(APIClient().get('/api/public/content/').data['site']['social_links'][0]['url'], 'https://github.com/x')

    def test_steps_shape_is_enforced(self):
        response = self.client.post('/api/admin/services/', {'title': 'S', 'slug': 's', 'steps': [{'label': 'A', 'text': 'B', 'extra': 1}]}, format='json')
        self.assertEqual(response.status_code, 400)


@override_settings(MEDIA_ROOT=MEDIA_DIR, MEDIA_MAX_UPLOAD_MB=1)
class MediaTests(Base):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA_DIR, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        super().setUp()
        self.client = signed_in(self.editor)

    def test_valid_image_is_reencoded_to_webp_with_thumbnail(self):
        response = upload(self.client, png_bytes((3000, 1500)), alt_text='A blue banner')
        self.assertEqual(response.status_code, 201, response.data)
        asset = MediaAsset.objects.get()
        self.assertEqual((asset.mime_type, asset.source_format), ('image/webp', 'PNG'))
        self.assertEqual((asset.width, asset.height), (2400, 1200))  # capped
        self.assertTrue(asset.file.name.endswith('.webp') and 'photo' not in asset.file.name)  # random storage key
        with Image.open(asset.thumbnail.path) as thumb:
            self.assertEqual(thumb.format, 'WEBP')
            self.assertLessEqual(max(thumb.size), 480)

    def test_non_images_and_disguised_files_are_rejected(self):
        cases = [
            (b'<?php system($_GET["c"]); ?>', 'shell.png', 'image/png'),
            (b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'x.svg', 'image/svg+xml'),
            (b'MZ\x90\x00' + b'\x00' * 200, 'x.exe', 'application/octet-stream'),
        ]
        for data, name, content_type in cases:
            self.assertEqual(upload(self.client, data, name, content_type).status_code, 400, name)
        gif = BytesIO()
        Image.new('RGB', (10, 10)).save(gif, format='GIF')
        self.assertEqual(upload(self.client, gif.getvalue(), 'a.gif', 'image/gif').status_code, 400)
        self.assertFalse(MediaAsset.objects.exists())

    def test_size_limit(self):
        noisy = Image.effect_noise((1400, 1400), 100).convert('RGB')
        buffer = BytesIO()
        noisy.save(buffer, format='PNG')
        self.assertGreater(len(buffer.getvalue()), 1024 * 1024)
        self.assertEqual(upload(self.client, buffer.getvalue()).status_code, 400)

    def test_in_use_media_cannot_be_deleted_and_replace_keeps_references(self):
        asset_id = upload(self.client, png_bytes()).data['id']
        member = TeamMember.objects.create(name='A', slug='a', role_title='Dev', profile_media_id=asset_id, status=Status.PUBLISHED)
        blocked = self.client.delete(f'/api/admin/media/{asset_id}/')
        self.assertEqual(blocked.status_code, 409)
        self.assertEqual(blocked.data['references'][0]['label'], 'A')

        old_name = MediaAsset.objects.get(pk=asset_id).file.name
        replaced = self.client.post(f'/api/admin/media/{asset_id}/replace/',
                                    {'file': SimpleUploadedFile('new.png', png_bytes(color=(200, 20, 20)), content_type='image/png')}, format='multipart')
        self.assertEqual(replaced.status_code, 200)
        self.assertNotEqual(MediaAsset.objects.get(pk=asset_id).file.name, old_name)
        member.refresh_from_db()
        self.assertEqual(str(member.profile_media_id), asset_id)

        member.profile_media = None
        member.save()
        self.assertEqual(self.client.delete(f'/api/admin/media/{asset_id}/').status_code, 204)
        self.assertFalse(MediaAsset.objects.exists())

    def test_alt_text_is_editable_and_plain_text(self):
        asset_id = upload(self.client, png_bytes()).data['id']
        self.assertEqual(self.client.patch(f'/api/admin/media/{asset_id}/', {'alt_text': 'Team photo'}, format='json').status_code, 200)
        self.assertEqual(self.client.patch(f'/api/admin/media/{asset_id}/', {'alt_text': '<b>x</b>'}, format='json').status_code, 400)


class DashboardAndInquiryTests(Base):
    def test_dashboard_counts_come_from_the_database(self):
        Project.objects.create(title='P1', slug='p1', status=Status.PUBLISHED)
        Project.objects.create(title='P2', slug='p2')
        ContactInquiry.objects.create(name='A', email='a@example.com', service='saas', details='x' * 30)
        data = signed_in(self.admin).get('/api/admin/dashboard/').data
        self.assertEqual(data['projects'], {'total': 2, 'published': 1})
        self.assertEqual(data['inquiries']['new'], 1)

    def test_admin_updates_inquiry_status_but_cannot_edit_content(self):
        inquiry = ContactInquiry.objects.create(name='A', email='a@example.com', service='saas', details='x' * 30)
        client = signed_in(self.admin)
        response = client.patch(f'/api/admin/inquiries/{inquiry.pk}/', {'lead_status': 'contacted', 'details': 'tampered'}, format='json')
        self.assertEqual(response.status_code, 200)
        inquiry.refresh_from_db()
        self.assertEqual((inquiry.lead_status, inquiry.details), ('contacted', 'x' * 30))
        self.assertEqual(client.get('/api/admin/inquiries/?lead_status=new').data['count'], 0)

    def test_health(self):
        self.assertEqual(APIClient().get('/api/health/').data, {'status': 'ok', 'database': 'ok'})


class SeedTests(TestCase):
    def test_seed_is_idempotent_and_matches_current_site(self):
        call_command('seed_content', stdout=__import__('io').StringIO())
        counts = (Page.objects.count(), Project.objects.count(), Service.objects.count(), TeamMember.objects.count())
        call_command('seed_content', stdout=__import__('io').StringIO())
        self.assertEqual(counts, (Page.objects.count(), Project.objects.count(), Service.objects.count(), TeamMember.objects.count()))
        content = APIClient().get('/api/public/content/').data
        self.assertEqual([c['title'] for c in content['capabilities']][:2], ['Web Applications', 'SaaS Products'])
        self.assertEqual(content['pages']['home']['sections']['hero']['content']['brand'], 'DevSphere')
        self.assertEqual(len(content['team']), 3)
        self.assertIsNotNone(content['team'][0]['portrait'])
        self.assertTrue(all(p['cover'] is None for p in content['projects']))  # no hot-linked third-party images
