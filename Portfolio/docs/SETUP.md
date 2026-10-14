# DevSphere — Setup, Operations & Deployment

React (Vite) frontend · Django REST Framework API · PostgreSQL · Docker Compose.
Content is edited in the dashboard at **`/admin`**, stored in PostgreSQL, and rendered by the public site.

```
Portfolio/
├── compose.yaml            dev stack: frontend (Vite) + backend (runserver) + db
├── compose.prod.yaml       production-style stack: web (nginx) + backend (gunicorn) + db
├── .env.example            Compose variables (Postgres password, ports)
├── backend/                Django project
│   ├── accounts/           users, sessions, login API, bootstrap_admin
│   ├── cms/                content models, media, public + admin APIs, seed_content, prune_media
│   ├── portfolio/          contact form inquiries
│   ├── .env.example        Django settings (server-side secrets)
│   └── Dockerfile          targets: dev, prod
├── frontend/
│   ├── src/content/        loads published content from the API (falls back to bundled copy)
│   ├── src/admin/          the dashboard (lazy-loaded; not in the public bundle)
│   ├── nginx.conf          production web server (SPA + /api proxy + /media)
│   └── Dockerfile          targets: dev, build, prod
└── docs/                   this guide and CMS_CHECKLIST.md
```

---

## 1. First-time local setup

Prerequisites: **Docker Desktop** (with at least ~10 GB free disk), Git. Optional for running without
Docker: Python 3.12+ and Node 24.

```bash
cd Portfolio
cp .env.example .env                       # then set POSTGRES_PASSWORD (any long random string)
cp backend/.env.example backend/.env       # set DJANGO_SECRET_KEY; keep DJANGO_DEBUG=True locally
# Put the same Postgres password into DATABASE_URL in backend/.env (only used when running Django
# outside Docker).
```

### Option 1 — everything in Docker (recommended)

```bash
docker compose up --build -d            # first run builds images; db → backend → frontend start in order
docker compose exec backend python manage.py seed_content      # current site content (safe to re-run)
docker compose exec backend python manage.py bootstrap_admin   # prompts for email + password, once
```

| URL | What |
|---|---|
| http://localhost:5173 | public site (hot reload) |
| http://localhost:5173/admin | dashboard |
| http://localhost:8000/api/health/ | API health (DB check) |
| http://localhost:8000/django-admin/ | Django's built-in admin (emergency use) |

The backend container runs `migrate` and `createcachetable` automatically **in development only**.
Ports: Postgres is published on `127.0.0.1:5433`, the API on `BACKEND_HOST_PORT` (default 8000). If
something else already uses 8000, set `BACKEND_HOST_PORT=8001` in `.env`.

### Option 2 — only Postgres in Docker, Django and Vite on your machine

```bash
docker compose up -d db
cd backend
python -m venv venv && venv\Scripts\activate        # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate && python manage.py createcachetable
python manage.py seed_content
python manage.py bootstrap_admin
python manage.py runserver                            # http://127.0.0.1:8000

cd ../frontend && npm ci && npm run dev               # http://localhost:5173 (proxies /api and /media)
```

**Using a PostgreSQL you installed yourself** (e.g. PostgreSQL 18 on Windows, port 5432) instead of the
Docker `db`: set `DATABASE_URL=postgres://devsphere:x@127.0.0.1:5432/devsphere` (the password is a
placeholder), then run

```bash
python manage.py provision_database          # asks for the "postgres" admin password once; never stores it
python manage.py migrate
```

It creates (or repairs) the `devsphere` login role with a random password, makes it owner of the database
and the `public` schema, writes the real `DATABASE_URL` into `backend/.env`, and verifies the login. It is safe
to re-run, and the app never runs as the superuser. Not needed with Docker Compose or managed Postgres, which
create the role for you.

**Docker using that same PostgreSQL** (one database for everything, as on the main dev PC): in
`Portfolio/.env` remove `COMPOSE_PROFILES=docker-db` and set

```
DOCKER_DATABASE_HOST=host.docker.internal
DOCKER_DATABASE_PORT=5432
```

The Docker backend then reads the same `DATABASE_URL` (credentials) from `backend/.env` and only swaps the
host, and the `db` container is not started. To go back to Postgres in Docker, restore
`COMPOSE_PROFILES=docker-db`, remove those two lines, and point `DATABASE_URL` at `127.0.0.1:5433`.

> **Windows:** use `127.0.0.1`, not `localhost`, in `DATABASE_URL`. With `localhost`, every database
> connection first tries IPv6 and waits ~30 s.

Both options share `backend/media/` for uploaded images, so you can switch between them freely.

### Everyday commands

| Command | Purpose |
|---|---|
| `docker compose up -d` / `docker compose stop` | start / stop (data kept) |
| `docker compose logs -f backend` | follow API logs |
| `docker compose exec backend python manage.py test` | run the backend test suite (PostgreSQL) |
| `docker compose up -d --build` | rebuild after dependency changes |
| `docker compose up -d --renew-anon-volumes frontend` | after changing `package.json` (refreshes the container's `node_modules`) |
| `docker compose down` | remove containers; **database volume is kept** |
| ~~`docker compose down -v`~~ | **deletes the database volume.** Never use it routinely. |

Rebuilding an image or recreating a container never touches data. Data lives in the `pgdata` volume
(database) and `backend/media/` (images). Only deleting the volume, or that folder, loses it.

---

## 2. Admin accounts

- **First admin:** `python manage.py bootstrap_admin`. It prompts, or reads `INITIAL_ADMIN_EMAIL`,
  `INITIAL_ADMIN_NAME` and `INITIAL_ADMIN_PASSWORD` with `--no-input`. The password must be 12+ characters
  and not common. It is safe to re-run: if any admin exists it changes nothing and never overwrites a password.
  Remove `INITIAL_ADMIN_PASSWORD` from the environment afterwards.
- **More people:** Dashboard → **Users** (admins only). Roles: **editor** (content and media) and
  **admin** (also settings, inquiries, users, activity). There is no public sign-up, and the last active
  admin cannot be demoted or disabled.
- **Locked out?** `docker compose exec backend python manage.py changepassword you@example.com`.
- Sessions last 8 h (`SESSION_HOURS`). Each user can see and revoke their own sessions under **Account**.
  Changing a password signs out every other session.

---

## 3. Editing content

| Dashboard area | Controls on the site |
|---|---|
| Pages & sections | hero, section headings, homepage CTA, About intro/team/closing, Contact intro/closing, Projects intro, SEO titles |
| Projects | Selected Work (featured first) and `/projects` (+ gallery images) |
| Team | About page profiles and portraits |
| Capabilities | the six “From complex ideas…” cards |
| Services | the numbered strip under the hero |
| Technology stack | grouped tech cards |
| Site settings | contact email/phone, availability, location, footer tagline, social links |
| Inquiries | messages from the Contact form (private) |
| Activity log | who changed what (admins) |

**How changes reach the public site**

- **Pages:** editing a section saves a *draft*. Use **Preview draft** to see it on the real site
  (`?preview=1`, only for signed-in users), then **Publish changes**. Visitors only ever see the last
  published snapshot.
- **Lists** (projects, team, …): each item is *Draft* or *Published*. New items start as drafts. Saved edits
  to a published item go live straight away.
- Public content is cached for **up to 60 seconds**, so a visitor may see the old version briefly. Preview
  is never cached.
- If the API is unreachable, the site shows its bundled default content instead of breaking.

**Images:** Media library → Upload (JPEG, PNG, WebP or AVIF, ≤ 8 MB). Every upload is decoded to prove it
is a real image, auto-rotated, capped at 2400 px, converted to WebP (which also strips EXIF/GPS) and given a
480 px thumbnail. Add alt text. **Replace file** keeps the same asset, so every page using it updates.
Images that are still in use cannot be deleted; the panel lists where each one is used.
`python manage.py prune_media` lists stray files with no database row, and `--delete` removes them.

---

## 4. Email notifications for the contact form

Inquiries are always saved (Dashboard → Inquiries). To also get an email, set these in `backend/.env`
and restart the backend:

```
CONTACT_NOTIFY_EMAIL=you@gmail.com
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=you@gmail.com
EMAIL_HOST_PASSWORD=<16-character Gmail App Password, no spaces>
DEFAULT_FROM_EMAIL=DevSphere Website <you@gmail.com>
```

Gmail needs an **App Password**, not a passkey: myaccount.google.com/apppasswords, with 2-Step
Verification on. A mail failure never loses the inquiry.

---

## 5. Production deployment

**Development and production are configured separately.** Development uses `backend/.env` (from
`backend/.env.example`). Production uses the host's environment variables or `backend/.env.production`
(from `backend/.env.production.example`), plus `.env.production` (from `.env.production.example`) for
`compose.prod.yaml`. Your development `.env` files are never deployed: they are git-ignored and excluded
from images.

Production sets `DJANGO_ENV=production` (the images and `compose.prod.yaml` do this already). In that mode
the app **refuses to start** if:
- `DJANGO_DEBUG` is on,
- the secret key is missing, weak, or the development one,
- `DJANGO_ALLOWED_HOSTS` is `*`,
- the database address is development-only (`host.docker.internal`, or a `DATABASE_HOST` / `DATABASE_PORT`
  override).

**Before every release** run `python manage.py check --deploy` on the server (or as a one-off container). It
reports what is allowed but usually wrong in production: localhost-only hosts, non-HTTPS origins, insecure
cookies, a superuser database login, local media on platforms with temporary disks, and emails that are
not really sent. With DEBUG off, cookies are `Secure` automatically, so serve over **HTTPS**.

### Option A — Vercel frontend + container API + managed Postgres (simplest to run)

1. **Database:** a managed PostgreSQL service (Neon, Supabase, RDS, Render, …). Use its connection string
   as `DATABASE_URL` (add `?sslmode=require` if the provider needs it).
2. **Media:** an S3-compatible bucket (AWS S3, Cloudflare R2, DigitalOcean Spaces) with public read on
   uploaded objects. Set `MEDIA_STORAGE=s3` and the `MEDIA_S3_*` variables. Container disks are wiped on
   redeploy, so do not use local media storage here.
3. **API:** deploy `backend/` with `Dockerfile` target `prod` to any container host (Render, Railway,
   Fly.io, Cloud Run, a VPS, …). Set the env vars from `backend/.env.example`, plus:
   ```
   DJANGO_ALLOWED_HOSTS=api.example.com
   CSRF_TRUSTED_ORIGINS=https://www.example.com
   FRONTEND_ORIGINS=https://www.example.com
   SESSION_COOKIE_SAMESITE=None          # frontend and API on different sites
   SECURE_SSL_REDIRECT=True
   SECURE_HSTS_SECONDS=31536000
   ```
   Then run, once per release (the image never migrates on its own):
   `python manage.py migrate && python manage.py createcachetable`, and for the first deploy
   `seed_content` and `bootstrap_admin`.
4. **Frontend:** import `frontend/` into Vercel (framework: Vite, build `npm run build`, output `dist`). Set
   `VITE_API_URL=https://api.example.com/api` (public, build-time). Add a rewrite so client routes such as
   `/admin` and `/about` serve `index.html`:
   `{ "rewrites": [{ "source": "/((?!assets/).*)", "destination": "/index.html" }] }` in `vercel.json`.

   Trade-off: cookies are cross-site (`SameSite=None; Secure`). Some privacy-focused browsers restrict
   those. Serving the API from a subdomain of the same site (`www.example.com` + `api.example.com`)
   avoids most of the issue, and Option B avoids it entirely.

### Option B — one container host, same origin (compose.prod.yaml)

```bash
cp .env.example .env.production                 # strong POSTGRES_PASSWORD, HTTP_PORT
cp backend/.env.example backend/.env.production # DJANGO_* values, CSRF_TRUSTED_ORIGINS=https://your.domain
docker compose -f compose.prod.yaml --env-file .env.production up -d --build
docker compose -f compose.prod.yaml --env-file .env.production run --rm backend python manage.py migrate
docker compose -f compose.prod.yaml --env-file .env.production run --rm backend python manage.py createcachetable
docker compose -f compose.prod.yaml --env-file .env.production run --rm backend python manage.py seed_content     # first deploy only
docker compose -f compose.prod.yaml --env-file .env.production run --rm backend python manage.py bootstrap_admin  # first deploy only
```

nginx (`web`) serves the SPA, proxies `/api` and `/django-admin` to gunicorn, and serves `/media` from the
shared volume. Postgres is not published outside Docker. Put HTTPS in front (a cloud load balancer, Caddy
or Traefik) and keep `SECURE_SSL_REDIRECT=True` there. Compose is not a hosting platform: run this on a
server you maintain (OS updates, firewall, backups), or prefer managed Postgres plus S3 media even here.

**Release routine:** pull → `up -d --build` → `run --rm backend python manage.py check --deploy` →
`run --rm backend python manage.py migrate` → check `/api/health/`.

---

## 6. Backups & recovery

```bash
# Backup (writes a compressed custom-format dump to Portfolio/backups/, which is git-ignored)
docker compose exec -T db pg_dump -U devsphere -d devsphere -Fc > backups/devsphere-$(date +%F).dump

# Restore into the running database (overwrites matching objects)
docker compose exec -T db pg_restore -U devsphere -d devsphere --clean --if-exists < backups/devsphere-YYYY-MM-DD.dump
```

- Back up **both** the database and media (`backend/media/`, the `media` volume, or the bucket, depending
  on storage). Media files are referenced by the database, so restore them together.
- Production: enable your managed provider's automated daily backups and point-in-time recovery, and
  test a restore into a staging database regularly. Keep copies off the server.
- Seed data is recreatable (`seed_content`), but edits, inquiries and uploads are not.

---

## 7. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Every Django command takes ~30 s+ (Windows) | `DATABASE_URL` uses `localhost`; use `127.0.0.1`. |
| `DATABASE_URL is not set` / `must point to PostgreSQL` | Copy `backend/.env.example` → `backend/.env`; SQLite is intentionally unsupported. |
| Login says “The security check failed” (403) | The page's origin is not in `CSRF_TRUSTED_ORIGINS`. Add it, e.g. `http://localhost:4173` or your domain. |
| Login says “Too many sign-in attempts” | Rate limit (5/min per account, 10/min per IP). Wait a minute. |
| `ports are not available … 8000` | Another app uses the port: set `BACKEND_HOST_PORT=8001` in `.env`. |
| Frontend container restarts in a loop after a dependency change | `docker compose up -d --build --renew-anon-volumes frontend` |
| Images 404 in Docker but work outside it (or vice versa) | Both setups use `backend/media/`; check that the file exists there and run `prune_media` to compare. |
| Docker errors like “read-only file system” / “input/output error” | The host disk is full. Free space, then restart Docker Desktop. Reclaim Docker space with `docker builder prune` (build cache only). |
| Edits not visible on the site | Pages need **Publish changes**; public content can be cached for up to 60 s. Use Preview to check immediately. |
| Contact form says it couldn't reach the server | The API isn't running (`docker compose ps`, `/api/health/`). |
| Health check reports `database: unavailable` | Postgres is down or `DATABASE_URL` is wrong: `docker compose logs db`. |

---

## 8. Security notes

- Passwords are hashed with **Argon2id**. Sessions are server-side (DB), the cookie is `HttpOnly`, and only
  a SHA-256 hash of each session key is stored in `auth_sessions`, so revoking a session takes effect on
  its next request.
- CSRF is enforced on login and on every write. Login is throttled per IP and per account, and its error
  message never reveals whether an email exists.
- Every admin endpoint checks authentication and role on the server. The public API returns published
  content only, and inquiries are never public.
- Content is plain text (HTML is rejected), links must be `https://`, `mailto:`, `tel:`, `/` or `#`,
  and JSON fields are schema-validated.
- Uploads are re-encoded server-side, size and pixel limited, and stored under random names.
- The audit log never records passwords, tokens or session keys.
- Secrets live only in git-ignored `.env*` files or the host's secret store. Never in images, Compose
  files or `VITE_*` variables.
