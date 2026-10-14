"""
Seed the CMS with the portfolio's current content.

Idempotent and non-destructive: every row is matched on its natural key (slug, page + section key,
category + name) and is only created when missing. Existing rows — including anything edited in the
dashboard — are never overwritten, so running this twice (or against production) is safe.
"""

import json
import re
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from cms import pages as page_service
from cms import validation
from cms.media import process_image
from cms.models import (
    Capability,
    MediaAsset,
    Page,
    PageSection,
    Project,
    Service,
    SiteSettings,
    Status,
    TeamMember,
    TechnologyItem,
)

SEED_DIR = Path(__file__).resolve().parents[2] / 'seed'
CONTACT_EMAIL = 'devsphere1130@gmail.com'

PAGES = {
    'home': {
        'title': 'Home',
        'meta_title': 'devsphere | Premium Software Developer Portfolio',
        'sections': [
            ('hero', {'content': {
                'eyebrow': 'DEVSPHERE / STUDIO', 'brand': 'DevSphere',
                'tagline_prefix': 'Software that keeps your business', 'tagline_highlight': 'in orbit.',
                'rotating_words': ['web apps', 'dashboards', 'SaaS products', 'landing pages'],
                'chips': ['Development', 'Testing', 'Marketing', 'UI/UX'],
                'primary_cta': {'label': 'Start a Project', 'href': '#contact'},
                'secondary_cta': {'label': 'View Our Work', 'href': '#work'},
                'founder_name': 'DevSphere IT Solutions', 'founder_initials': 'DS', 'founder_role': 'Founder',
                'stats': [{'value': '15+', 'label': 'Projects shipped'}, {'value': '1.5 yrs', 'label': 'Experience'},
                          {'value': '100%', 'label': 'Remote-ready'}],
                'status_items': ['Available for new projects', 'Based in India', 'Working worldwide'],
            }, 'description': 'We design, build, test and market production-ready web applications for startups and growing teams.'}),
            ('selected-work', {'title': 'Selected Work',
                               'subtitle': "A selection of digital products and business systems I've designed and engineered.",
                               'content': {'cta': {'label': 'View All Projects', 'href': '/projects'}}}),
            ('capabilities', {'title': 'From complex ideas to production-ready software.',
                              'subtitle': 'Client work usually fails when the build ignores the business workflow. These capabilities are framed around outcomes first.'}),
            ('tech-stack', {'title': 'Technology chosen for product outcomes.',
                            'subtitle': 'A practical engineering stack for scalable business applications, REST APIs, dashboards and polished customer-facing interfaces.'}),
            ('philosophy', {'title': 'I do not just write code. I solve the system behind the problem.',
                            'content': {'eyebrow': 'Engineering Philosophy', 'items': [
                                {'title': 'Business First', 'description': 'Understand the workflow and commercial goal before choosing technology or interface patterns.'},
                                {'title': 'Built to Scale', 'description': 'Structure code, APIs and data around the next stage of the product, not just the first release.'},
                                {'title': 'User Focused', 'description': 'Make complex operations feel clear for the people who depend on the software every day.'},
                                {'title': 'Production Mindset', 'description': 'Performance, security, accessibility and maintainability are treated as core product features.'},
                            ]}}),
            ('cta', {'title': 'Have a product, platform or complex idea in mind?',
                     'description': 'Let us turn it into software that works for real users, real operations and real business goals.',
                     'content': {'eyebrow': 'Start the conversation',
                                 'primary_cta': {'label': 'Start a Project', 'href': f'mailto:{CONTACT_EMAIL}'},
                                 'secondary_cta': {'label': "Let's Talk", 'href': f'mailto:{CONTACT_EMAIL}'}}}),
        ],
    },
    'about': {
        'title': 'About',
        'meta_title': 'About DevSphere',
        'sections': [
            ('intro', {'description': 'We bring together development, product thinking, and software quality to build digital experiences that work beautifully and perform reliably.',
                       'content': {'eyebrow': 'About DevSphere', 'title_lines': ['Good software', 'starts with the', 'right people.'],
                                   'studio_capabilities': ['Engineering', 'Product Experience', 'Quality & Testing'],
                                   'meta': [{'label': 'Studio', 'value': 'DevSphere'}, {'label': 'Based', 'value': 'India'},
                                            {'label': 'Working', 'value': 'Worldwide'}]}}),
            ('team', {'title': 'Small team.',
                      'description': 'Meet the people turning ideas into thoughtful interfaces, reliable software, and production-ready experiences.',
                      'content': {'eyebrow': 'The people behind the work', 'title_highlight': 'Serious execution.'}}),
            ('closing', {'title': 'Have a product that needs',
                         'content': {'eyebrow': 'Work with the team', 'title_highlight': 'careful hands?',
                                     'primary_cta': {'label': 'Start a Project', 'href': '/contact'},
                                     'secondary_cta': {'label': 'View Our Work', 'href': '/#work'}}}),
        ],
    },
    'contact': {
        'title': 'Contact',
        'meta_title': 'Contact DevSphere',
        'sections': [
            ('intro', {'title': 'Let’s Build Something Great',
                       'description': 'Have a project in mind, a business challenge to solve, or an idea you’d like to bring to life? Tell me what you’re working on. Let’s explore how we can turn it into a reliable digital product.',
                       'content': {'eyebrow': 'Get in touch / Start a project', 'title_highlight': 'Together.',
                                   'tagline': 'From the first idea to a production-ready experience.'}}),
            ('closing', {'title': 'Have an idea worth building?',
                         'description': 'Share what you have in mind. We can start with the problem, explore the possibilities, and define the right next step.',
                         'content': {'cta_label': 'Start a Conversation'}}),
        ],
    },
    'projects': {
        'title': 'Projects',
        'meta_title': 'Projects — DevSphere',
        'sections': [
            ('intro', {'title': 'Production-ready work across web apps, SaaS and business systems.',
                       'description': 'Explore the complete project collection, from dashboards and backend systems to scalable product platforms.',
                       'content': {'eyebrow': 'All Projects'}}),
        ],
    },
}


def _strip_note(text):
    return re.sub(r'\s+', ' ', text or '').strip()


class Command(BaseCommand):
    help = 'Create any missing CMS content from the current portfolio (never overwrites existing rows).'

    def handle(self, *args, **options):
        data = json.loads((SEED_DIR / 'content.json').read_text(encoding='utf-8'))
        self.created = 0
        with transaction.atomic():
            self.seed_settings()
            self.seed_pages()
            self.seed_capabilities(data['capabilities'])
            self.seed_services(data['services'])
            self.seed_technologies(data['technologies'])
            self.seed_projects(data['projects'])
            self.seed_team(data['team'])
        self.stdout.write(self.style.SUCCESS(f'Seeding finished: {self.created} new row(s). Existing content was left untouched.'))

    def make(self, model, lookup, defaults):
        obj, created = model.objects.get_or_create(**lookup, defaults=defaults)
        self.created += int(created)
        return obj, created

    def seed_settings(self):
        if SiteSettings.objects.exists():
            return
        SiteSettings.objects.create(
            site_name='DevSphere', default_title='devsphere | Premium Software Developer Portfolio',
            default_description='Premium digital products and business systems engineered with clarity, precision and care.',
            contact_email=CONTACT_EMAIL, location_text='Based in India · Working worldwide',
            availability_text='Available for new projects',
            footer_tagline='Premium digital products and business systems engineered with clarity, precision and care.',
            social_links=[],  # add real profile URLs from the dashboard; none are invented here
        )
        self.created += 1

    def seed_pages(self):
        for slug, spec in PAGES.items():
            page, created = self.make(Page, {'slug': slug}, {'title': spec['title'], 'meta_title': spec['meta_title']})
            for order, (key, fields) in enumerate(spec['sections']):
                content = validation.section_content(slug, key, fields.get('content', {}))
                self.make(PageSection, {'page': page, 'section_key': key}, {
                    'title': fields.get('title', ''), 'subtitle': fields.get('subtitle', ''),
                    'description': fields.get('description', ''), 'content': content, 'display_order': order,
                })
            if created:
                page_service.publish_page(page, None)

    def seed_capabilities(self, items):
        for order, item in enumerate(items):
            self.make(Capability, {'slug': item['id']}, {
                'title': item['title'], 'card_description': item['description'], 'headline': item['headline'],
                'summary': item['summary'], 'example': item['example'],
                'deliverables_label': item.get('buildsLabel', 'What we can build'), 'deliverables': item['builds'],
                'steps': item['steps'], 'business_outcome': item['outcome'], 'note': _strip_note(item.get('note')),
                'display_order': order, 'status': Status.PUBLISHED,
            })
        Capability.objects.filter(status=Status.PUBLISHED, published_at__isnull=True).update(published_at=_now())

    def seed_services(self, items):
        for order, item in enumerate(items):
            self.make(Service, {'slug': item['id']}, {
                'title': item['title'], 'headline': item['headline'], 'summary': item['summary'],
                'example': item['example'], 'steps': item['steps'], 'deliverables': item['deliverables'],
                'audience': item['audience'], 'display_order': order, 'status': Status.PUBLISHED,
            })
        Service.objects.filter(status=Status.PUBLISHED, published_at__isnull=True).update(published_at=_now())

    def seed_technologies(self, groups):
        for group_index, group in enumerate(groups):
            for order, item in enumerate(group['items']):
                self.make(TechnologyItem, {'category': group['category'], 'name': item['name']}, {
                    'description': item['description'], 'display_order': group_index * 100 + order,
                    'status': Status.PUBLISHED,
                })
        TechnologyItem.objects.filter(status=Status.PUBLISHED, published_at__isnull=True).update(published_at=_now())

    def seed_projects(self, items):
        # Existing sample projects are kept as-is but without their hot-linked third-party images;
        # upload your own covers in the dashboard. Review these entries before relying on them.
        for order, item in enumerate(items):
            self.make(Project, {'slug': slugify(item['title'])}, {
                'title': item['title'], 'category': item.get('category', ''), 'problem_statement': item.get('problem', ''),
                'short_description': item['description'][:300], 'description': item['description'],
                'technologies': item.get('technologies', []), 'is_featured': order < 2, 'display_order': order,
                'status': Status.PUBLISHED,
            })
        Project.objects.filter(status=Status.PUBLISHED, published_at__isnull=True).update(published_at=_now())

    def seed_team(self, members):
        for order, item in enumerate(members):
            member, created = self.make(TeamMember, {'slug': slugify(item['name'])}, {
                'name': item['name'].strip(), 'role_title': item['role'], 'discipline': item.get('discipline', ''),
                'experience_text': item.get('experience') or '', 'location_text': item.get('location') or '',
                'focus': item.get('focus') or '', 'short_bio': item.get('introduction') or '',
                'expertise_label': item.get('expertiseLabel', 'Expertise'), 'expertise': item.get('expertise', []),
                'portrait_position': (item.get('portrait') or {}).get('position', ''), 'display_order': order,
                'status': Status.PUBLISHED,
            })
            portrait = item.get('portrait')
            if created and portrait and (SEED_DIR / portrait['src']).exists():
                upload = SimpleUploadedFile(portrait['src'], (SEED_DIR / portrait['src']).read_bytes())
                asset = MediaAsset.objects.create(original_filename=portrait['src'],
                                                  alt_text=f"Portrait of {member.name}, {member.role_title}",
                                                  **process_image(upload))
                member.profile_media = asset
                member.save(update_fields=['profile_media'])
        TeamMember.objects.filter(status=Status.PUBLISHED, published_at__isnull=True).update(published_at=_now())


def _now():
    from django.utils import timezone
    return timezone.now()
