# DevSphere CMS — Implementation Plan & Checklist

Living checklist for turning the DevSphere portfolio into a database-driven site with a secure
admin dashboard, PostgreSQL and Docker. Items are ticked only after they are built **and verified**.

Legend: `[x]` done and verified · `[~]` done, partly verified (see note) · `[ ]` not done

---

## 0. What exists today (analysis)

| Area | Finding | Decision |
|---|---|---|
| Frontend | React 19 + Vite 8, React Router 7, Tailwind 4, framer-motion, GSAP, R3F | Keep. Add a content layer + `/admin/*` routes |
| Backend | Django 6.1 + DRF 3.18, one app `portfolio` | Extend. No second backend |
| Database | SQLite (`db.sqlite3`) | Move to **PostgreSQL** via `DATABASE_URL` |
| Content | Hard-coded in `src/data/*.js` and inside components | Move into PostgreSQL; static files stay as an offline fallback |
| Existing API | `Project/Skill/About` ModelViewSets with **no auth** (anyone could create/delete) | Remove; replace with public read-only + protected admin APIs |
| Contact form | `POST /api/contact/` → `ContactInquiry`, Gmail notify | Keep endpoint; add status workflow + admin review |
| Auth | None (Django admin only) | Django auth, custom email-login user, DB sessions, CSRF |
| Docker | Docker Desktop installed, no config | Add Dockerfiles + Compose (dev and prod) |

## 1. Architecture decisions

- **One backend:** Django + DRF + Django ORM + Django migrations (no FastAPI, Prisma, SQLAlchemy).
- **Apps:** `accounts` (users, sessions, auth API), `cms` (content, media, audit, public + admin APIs),
  `portfolio` (contact inquiries).
- **Users:** custom `accounts.User` with email login, `role` = `admin` | `editor`. No public sign-up.
  First admin is created by an explicit, idempotent `bootstrap_admin` command.
- **Passwords:** Argon2id (`argon2-cffi`) as the primary hasher; Django validators enforce strength.
- **Sessions:** Django DB sessions in an HttpOnly cookie (`Secure` + `SameSite` from env), 8h expiry.
  An `auth_sessions` table stores only a SHA-256 hash of each session key and enables revocation.
- **CSRF:** DRF `SessionAuthentication` enforces CSRF on writes. `GET /api/auth/csrf/` returns the token
  in JSON, so it also works when the frontend is on a different domain (Vercel).
- **Rate limits:** DB-backed cache, shared by all workers. Login is throttled per IP and per email.
- **Draft / publish:**
  - Pages: sections are edited as a working copy, and **Publish** copies them into a published snapshot.
    The public API serves only the snapshot, so edits stay private until published.
  - Lists (projects, team, capabilities, services, tech): a `status` of draft or published. The public API
    filters to published.
  - Preview: `?preview=1` returns the working copy to logged-in staff only.
- **Media:** Pillow validates real image content (not extension), re-encodes to WebP (strips metadata),
  and generates a thumbnail. Files go through Django storage: local volume in dev, S3-compatible
  object storage in prod (`django-storages`). Metadata lives in `media_assets`. References use
  `on_delete=PROTECT`, so in-use images cannot be deleted.
- **Public content delivery:** one `GET /api/public/content/` bootstrap payload plus per-resource
  endpoints, with short `Cache-Control`. The frontend falls back to bundled static content if the API is down.
- **Admin UI:** React `/admin/*` with config-driven resource screens, so new content types are a schema
  entry rather than a new page. Django's own admin moves to `/django-admin/`.

## 2. Database tables

`users`, `auth_sessions`, `site_settings`, `pages`, `page_sections`, `media_assets`, `projects`,
`project_media`, `team_members`, `capabilities`, `services`, `technology_stack`, `contact_messages`
(existing `ContactInquiry`), `audit_logs`, plus Django's own `django_session`, `django_cache`, etc.

---

## 3. Checklist

### Phase A — Backend foundation
- [x] Dependencies pinned (`psycopg`, `Pillow`, `argon2-cffi`, `gunicorn`, `dj-database-url`, `django-storages`, `boto3`)
- [x] Settings read from env (secret key, debug, hosts, DB URL, CORS/CSRF origins, cookies, storage, email)
- [x] Startup validation of required env vars in production
- [x] PostgreSQL connection (no silent SQLite fallback)
- [x] Health check `GET /api/health/` (checks DB)
- [x] Old unauthenticated `Project/Skill/About` API removed

### Phase B — Auth & security
- [x] Custom `User` (email login, role, is_active, last_login, timestamps)
- [x] `AuthSession` (hashed session key, expires, last_seen, revoked) + revocation middleware
- [x] `bootstrap_admin` command (env or prompt, strong password, idempotent, never overwrites)
- [x] Login / logout / me / csrf / change-password endpoints
- [x] Login throttling (IP + email) and generic error messages
- [x] Role permissions: editor = content + media; admin = also settings, inquiries, users, activity
- [x] Audit log on important actions (no secrets logged)

### Phase C — Content models & APIs
- [x] Models + migrations for all CMS tables, with constraints and indexes
- [x] Section content validated per `section_key` (no raw HTML)
- [x] Admin CRUD APIs with search, filter, order, pagination
- [x] Publish / unpublish actions; page snapshot publishing
- [x] Public read-only APIs return published content only; preview for staff
- [x] Contact inquiries: status workflow, admin-only access
- [x] Idempotent `seed_content` command from the current site content

### Phase D — Media
- [x] Upload with real content validation, size limit, unique names, WebP output, thumbnail
- [x] Alt text editing, reference listing, protected delete
- [x] Local dev storage + S3-compatible prod storage by env

### Phase E — Admin dashboard (React)
- [x] `/admin/login` (email, password, show/hide, loading, errors)
- [x] Protected layout + responsive sidebar; session check; logout
- [x] Dashboard overview with real DB counts + recent activity
- [x] Pages & sections editor with publish + preview
- [x] Projects (incl. gallery), Team, Capabilities, Services, Technology stack
- [x] Media library (upload, preview, alt text, delete)
- [x] Site settings (contact, social links, footer)
- [x] Inquiries (list, filter, status) and Activity log
- [x] Confirmation dialogs, toasts, empty and loading states

### Phase F — Public site wired to the API
- [x] Content provider with static fallback; preview banner
- [x] Hero, Services strip, Capabilities, Selected Work + Projects page, Tech stack
- [x] About intro + team, Contact page details + intro, Footer, homepage CTA
- [x] Visual design unchanged

### Phase G — Docker
- [x] Backend Dockerfile (slim, non-root, gunicorn in prod)
- [x] Frontend Dockerfile (dev server target + nginx static prod target)
- [x] `compose.yaml` (dev) with healthchecks, named volumes, service-name networking
- [x] `compose.prod.yaml` (no DB port exposed, no source mounts, no auto-migrate)
- [x] `.dockerignore` files, `.env.example`
- [x] Build images and run the stack; migrate, bootstrap admin, seed, log in

### Phase H — Tests & verification
- [x] Django tests: auth, throttling, sessions, permissions, CRUD, publish, drafts private, ordering, media, contact (44 tests)
- [ ] Frontend unit tests (not added: the UI is covered by the browser end-to-end suite instead)
- [x] Tests run against PostgreSQL
- [x] Browser end-to-end: admin login, edit + publish, see change on the public site, upload image (31 checks; local, Docker dev and prod stacks)
- [x] Persistence after container recreation

### Phase I — Documentation
- [x] `docs/SETUP.md`: local (with and without Docker), env vars, admin bootstrap, seeding, media, email
- [x] Deployment (Vercel + container API + managed Postgres + object storage), backup/restore, troubleshooting

---

## 4. Progress log

- **Backend:** env-driven settings with production refusal; PostgreSQL 18 (Docker); 14 CMS tables; custom email
  user + hashed revocable sessions; Argon2id; CSRF; per-IP and per-account login throttles; editor/admin roles;
  audit log; page snapshot publishing; public published-only API with staff preview; Pillow image pipeline;
  idempotent `seed_content` (55 rows, then 0); `bootstrap_admin`; `prune_media`. 44 Django tests pass on
  PostgreSQL, on the host and inside the container.
- **Frontend:** content provider with bundled fallback (site unchanged visually); lazy-loaded `/admin` dashboard
  (85 KB chunk) with config-driven resource screens, page/section editor, media library, settings, inquiries,
  users, activity and account.
- **Docker:** dev stack (Vite + runserver + Postgres) and prod stack (nginx + gunicorn + Postgres) both built
  and verified. Prod: DEBUG off, non-root API, DB not published, Secure/HttpOnly/SameSite cookie, whitenoise
  static, nginx-served media, JSON 404s, migrations as one-off commands. Data and media survived
  `docker compose down` + `up`.
- **Fixed during verification:** CSRF origin for preview ports; Vite proxy rewriting Host (images pointed at
  `backend:8000`); Alpine/musl segfault (switched to `node:24-slim`); root-owned `node_modules`; nginx dropping
  the port from absolute URLs and dropping security headers per location; dev media volume hiding host files;
  test runs leaving orphan media files; Windows `localhost` 30 s DB connections; admin button styles overriding
  Tailwind's `lg:hidden`.
- **Incident:** the host C: drive filled to 0 bytes during the first Docker build, crashing Docker Desktop.
  No data was lost; a verified backup was taken once space was freed.
