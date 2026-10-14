"""
One-time database provisioning for a PostgreSQL server you administer (e.g. a local install).

Reads the target database name, app user, host and port from DATABASE_URL, connects with an admin
account (prompted, never stored), then idempotently:
  1. creates the app login role, or resets its password if it already exists,
  2. creates the database owned by that role, or transfers ownership to it,
  3. makes the role owner of the `public` schema (PostgreSQL 15+ no longer lets everyone create there),
  4. writes the new password into DATABASE_URL in the .env file and verifies the app login works.

The app always runs as this limited role, never as the admin/superuser.
Not needed with Docker Compose (the postgres image creates the role) or managed Postgres (the provider
gives you a DATABASE_URL).
"""

import getpass
import re
import secrets
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

import psycopg
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from psycopg import sql


class Command(BaseCommand):
    help = 'Create/repair the app role and database on a PostgreSQL server, and update DATABASE_URL in .env.'

    def add_arguments(self, parser):
        parser.add_argument('--admin-user', default='postgres', help='Admin role used for setup (default: postgres).')
        parser.add_argument('--admin-password', help='Admin password (omit to be prompted; avoid shell history).')
        parser.add_argument('--env-file', default=str(Path(settings.BASE_DIR) / '.env'), help='File whose DATABASE_URL is updated.')
        parser.add_argument('--no-write-env', action='store_true', help='Do not modify the .env file (prints nothing secret).')

    def handle(self, *args, **opts):
        target = urlsplit(settings.DATABASE_URL)
        db_name = target.path.lstrip('/')
        app_user = unquote(target.username or '')
        host, port = target.hostname or '127.0.0.1', target.port or 5432
        if not db_name or not app_user:
            raise CommandError('DATABASE_URL must include a user and a database name, e.g. postgres://devsphere:x@127.0.0.1:5432/devsphere')
        if app_user == opts['admin_user']:
            raise CommandError('The app user must differ from the admin user; the app should not run as a superuser.')

        admin_password = opts['admin_password'] or getpass.getpass(f'Password for PostgreSQL admin "{opts["admin_user"]}" on {host}:{port}: ')
        admin = dict(host=host, port=port, user=opts['admin_user'], password=admin_password, connect_timeout=10)
        app_password = secrets.token_urlsafe(24)  # URL-safe: no escaping needed in DATABASE_URL

        try:
            with psycopg.connect(dbname='postgres', autocommit=True, **admin) as conn:
                role_exists = conn.execute('SELECT 1 FROM pg_roles WHERE rolname = %s', [app_user]).fetchone()
                verb = 'ALTER' if role_exists else 'CREATE'
                conn.execute(sql.SQL('{} ROLE {} WITH LOGIN NOSUPERUSER NOCREATEROLE PASSWORD {}').format(
                    sql.SQL(verb), sql.Identifier(app_user), sql.Literal(app_password)))
                self.stdout.write(f'{"Updated" if role_exists else "Created"} role "{app_user}".')
                # CREATEDB lets `manage.py test` create its throwaway test database.
                conn.execute(sql.SQL('ALTER ROLE {} CREATEDB').format(sql.Identifier(app_user)))

                if conn.execute('SELECT 1 FROM pg_database WHERE datname = %s', [db_name]).fetchone():
                    conn.execute(sql.SQL('ALTER DATABASE {} OWNER TO {}').format(sql.Identifier(db_name), sql.Identifier(app_user)))
                    self.stdout.write(f'Database "{db_name}" now owned by "{app_user}".')
                else:
                    conn.execute(sql.SQL('CREATE DATABASE {} OWNER {} ENCODING {}').format(
                        sql.Identifier(db_name), sql.Identifier(app_user), sql.Literal('UTF8')))
                    self.stdout.write(f'Created database "{db_name}".')

            with psycopg.connect(dbname=db_name, autocommit=True, **admin) as conn:
                conn.execute(sql.SQL('ALTER SCHEMA public OWNER TO {}').format(sql.Identifier(app_user)))
        except psycopg.OperationalError as exc:
            raise CommandError(f'Could not connect as admin "{opts["admin_user"]}": {str(exc).strip().splitlines()[-1]}') from exc

        new_url = f'postgres://{quote(app_user, safe="")}:{app_password}@{host}:{port}/{db_name}'
        with psycopg.connect(new_url, connect_timeout=10) as conn:  # prove the app login works
            conn.execute('SELECT 1')

        if opts['no_write_env']:
            self.stdout.write(self.style.WARNING('--no-write-env: role password changed but .env not updated; set DATABASE_URL yourself.'))
        else:
            self._write_env(Path(opts['env_file']), new_url)
            self.stdout.write(f'Updated DATABASE_URL in {opts["env_file"]}.')
        self.stdout.write(self.style.SUCCESS(f'Ready: {app_user}@{host}:{port}/{db_name}. Next: python manage.py migrate'))

    @staticmethod
    def _write_env(path, url):
        text = path.read_text(encoding='utf-8') if path.exists() else ''
        line = f'DATABASE_URL={url}'
        if re.search(r'^DATABASE_URL=.*$', text, flags=re.M):
            text = re.sub(r'^DATABASE_URL=.*$', lambda _: line, text, count=1, flags=re.M)
        else:
            text = text.rstrip('\n') + f'\n{line}\n'
        path.write_text(text, encoding='utf-8')
