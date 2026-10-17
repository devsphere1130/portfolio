# DevSphere Portfolio

A database-driven portfolio with a secure content dashboard.

- **Frontend:** React 19 + Vite 8, Tailwind 4, GSAP / framer-motion, React Three Fiber
- **Backend:** Django 6 + Django REST Framework, Argon2id passwords, DB-backed sessions
- **Database:** PostgreSQL 18
- **Runtime:** Docker Compose for development; nginx + gunicorn production images

Visitors see published content only. Each published project has a case-study page at **`/work/<slug>`**. Editors sign in at **`/admin`** to edit pages, projects, team,
capabilities, services, the tech stack, images and site settings, and to review contact inquiries.

## Quick start (Docker)

```bash
cd Portfolio
cp .env.example .env                    # set POSTGRES_PASSWORD
cp backend/.env.example backend/.env    # set DJANGO_SECRET_KEY
docker compose up --build -d
docker compose exec backend python manage.py seed_content
docker compose exec backend python manage.py bootstrap_admin
```

Open http://localhost:5173 (site) and http://localhost:5173/admin (dashboard).

## Documentation

- **[docs/DEPLOY.md](docs/DEPLOY.md)** — production on Vercel (site) + Render (API) + Neon (database) + Cloudflare R2 (media).
- **[docs/SETUP.md](docs/SETUP.md)** — setup with or without Docker, admin accounts, editing content, media,
  email, production deployment (Vercel or containers), backups, troubleshooting, security notes.
- **[docs/WHATSAPP.md](docs/WHATSAPP.md)** — WhatsApp click-to-chat, lead management and the optional Cloud API.
- **[docs/CASE_STUDIES.md](docs/CASE_STUDIES.md)** — project case-study pages (`/work/<slug>`), the project editor, gallery and video uploads.
- **[docs/CMS_CHECKLIST.md](docs/CMS_CHECKLIST.md)** — architecture decisions and the verified build checklist.

## API overview

| Path | Access | Purpose |
|---|---|---|
| `GET /api/health/` | public | liveness + database check |
| `GET /api/public/content/` | public | everything the site renders (published only; `?preview=1` for signed-in staff) |
| `GET /api/public/pages/<slug>/`, `/projects/`, `/team/`, … | public | per-resource published content |
| `GET /api/public/projects/<slug>/` | public | a full case study (published sections only) |
| `POST /api/contact/` | public, rate-limited | contact form inquiry |
| `/api/auth/` (`csrf`, `login`, `logout`, `me`, `change-password`, `sessions`) | session | authentication |
| `/api/admin/…` | editor / admin | content, media, settings, inquiries, users, activity |

## Tests

```bash
docker compose exec backend python manage.py test     # backend tests, against PostgreSQL
cd frontend && npm test                               # frontend unit tests
```
