import getpass

from decouple import config
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from accounts.models import User


class Command(BaseCommand):
    help = (
        'Create the first dashboard administrator, once. Reads INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME and '
        'INITIAL_ADMIN_PASSWORD from the environment, or prompts. Safe to re-run: it never creates a '
        'second admin or overwrites an existing password.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--email', help='Admin email (default: INITIAL_ADMIN_EMAIL)')
        parser.add_argument('--name', help='Display name (default: INITIAL_ADMIN_NAME)')
        parser.add_argument('--no-input', action='store_true', help='Fail instead of prompting')

    def handle(self, *args, **opts):
        if User.objects.filter(role=User.Role.ADMIN).exists():
            self.stdout.write(self.style.WARNING('An admin account already exists. Nothing was changed.'))
            return

        email = (opts['email'] or config('INITIAL_ADMIN_EMAIL', default='')).strip().lower()
        name = (opts['name'] or config('INITIAL_ADMIN_NAME', default='')).strip()
        password = config('INITIAL_ADMIN_PASSWORD', default='')

        if not email:
            if opts['no_input']:
                raise CommandError('Set INITIAL_ADMIN_EMAIL or pass --email.')
            email = input('Admin email: ').strip().lower()
        if not name:
            name = email.split('@')[0] if opts['no_input'] else (input('Display name: ').strip() or email.split('@')[0])
        if User.objects.filter(email=email).exists():
            raise CommandError(f'{email} already exists as a non-admin account. Promote it from the dashboard or Django admin.')

        if not password:
            if opts['no_input']:
                raise CommandError('Set INITIAL_ADMIN_PASSWORD or run without --no-input to be prompted.')
            password = getpass.getpass('Password (min 12 characters): ')
            if password != getpass.getpass('Repeat password: '):
                raise CommandError('Passwords do not match.')

        try:
            validate_password(password, User(email=email, name=name))
        except ValidationError as exc:
            raise CommandError('Password rejected: ' + ' '.join(exc.messages)) from exc

        User.objects.create_superuser(email=email, name=name, password=password)
        self.stdout.write(self.style.SUCCESS(f'Created admin {email}. Remove INITIAL_ADMIN_PASSWORD from your environment now.'))
