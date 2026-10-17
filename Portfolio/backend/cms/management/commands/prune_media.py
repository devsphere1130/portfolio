import os

from django.conf import settings
from django.core.management.base import BaseCommand

from cms.models import MediaAsset


class Command(BaseCommand):
    help = ('List media files that no MediaAsset row references (e.g. left behind by a crashed upload). '
            'Nothing is deleted unless you pass --delete. Local storage only.')

    def add_arguments(self, parser):
        parser.add_argument('--delete', action='store_true', help='Actually delete the orphaned files.')

    def handle(self, *args, **options):
        if settings.MEDIA_STORAGE != 'local':
            self.stdout.write(self.style.WARNING('MEDIA_STORAGE is not local; use your bucket lifecycle tools instead.'))
            return
        known = set()
        for asset in MediaAsset.objects.only('file', 'thumbnail'):
            known.update({asset.file.name, asset.thumbnail.name})
        root = str(settings.MEDIA_ROOT)
        orphans = []
        for folder, _, files in os.walk(root):
            for name in files:
                rel = os.path.relpath(os.path.join(folder, name), root).replace(os.sep, '/')
                if rel not in known:
                    orphans.append(rel)
        for rel in sorted(orphans):
            self.stdout.write(f'{"deleting" if options["delete"] else "orphan"}: {rel}')
            if options['delete']:
                os.remove(os.path.join(root, rel))
        verb = 'Deleted' if options['delete'] else 'Found'
        self.stdout.write(self.style.SUCCESS(f'{verb} {len(orphans)} orphaned file(s).'))
