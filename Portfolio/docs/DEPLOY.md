# Deploying: Vercel + Render + Neon + Cloudflare R2

| Part | Service | Config in this repo |
|---|---|---|
| Website and dashboard (React) | **Vercel** | `Portfolio/frontend/vercel.json` |
| API (Django REST Framework) | **Render** (Docker) | `render.yaml` (repo root), `Portfolio/backend/Dockerfile` |
| Database (PostgreSQL) | **Neon** | `DATABASE_URL` |
| Photos and videos | **Cloudflare R2** | `MEDIA_STORAGE=s3` + `MEDIA_S3_*` |

## How the pieces connect

```
Browser ──► Vercel (www.yourdomain.com)
              ├─ /assets, pages ............ the React build
              ├─ /api/* ──── proxy ──────► Render: devsphere-api.onrender.com ──► Neon
              └─ /work/<slug> (link-preview bots only) ─► Render share page
Browser ──► R2 public domain (images, videos) ◄── direct video uploads (presigned PUT)
```

Vercel **proxies `/api` to Render**, so the browser only ever talks to one site. Login cookies are first-party
(`SameSite=Lax`), and no CORS setup is needed for the API. With the API on a separate `onrender.com` domain
instead, the dashboard login would rely on third-party cookies, which Safari blocks.

## Before you start

- Commit and push everything. Render and Vercel build from the GitHub repo, not your PC.
- Pick your final site address, e.g. `https://www.yourdomain.com` (or start with `https://<project>.vercel.app`).
  Below it is called **SITE**.

## 1. Neon (database)

1. Create a project (or use the one Vercel made). Its region must match `region:` in `render.yaml` (currently `virginia` = AWS US East 1).
2. Copy the connection string from **Connect**. Keep `?sslmode=require` on the end.
   - The **direct** host (no `-pooler` in the name) needs no extra settings. Use this one.
   - If you use the **pooled** host (`…-pooler…`), also set `DATABASE_DISABLE_SERVER_SIDE_CURSORS=True` on Render.
3. Optional: copy your current local content (projects, pages, admin users) into Neon:
   ```powershell
   pg_restore --no-owner --no-acl --clean --if-exists -d "<NEON_URL>" Portfolio\backups\<latest>.dump
   ```
   Without this you start empty. After the first deploy, create the admin and starter content (step 5).

Neon's free tier pauses the database after a few minutes idle. The first request after that takes about a
second longer. That is normal.

## 2. Cloudflare R2 (photos and videos)

1. **R2 → Create bucket**, e.g. `devsphere-media`.
2. **Public access:** bucket → Settings → connect a **custom domain** (e.g. `media.yourdomain.com`, best), or
   turn on the **r2.dev** URL (fine for testing; Cloudflare rate-limits it). Put that host, *without* `https://`,
   into `MEDIA_S3_CUSTOM_DOMAIN`. The R2 S3 endpoint itself is private, so links built from it would not load
   (`manage.py check --deploy` warns: `devsphere.W023`).
3. **R2 → Manage API tokens → Create token**: *Object Read & Write*, limited to this bucket. Note the
   **Access Key ID**, **Secret Access Key** and the endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
4. **Bucket → Settings → CORS policy** (needed for direct video uploads and captions):
   ```json
   [{ "AllowedOrigins": ["https://www.yourdomain.com"], "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["Content-Type", "Cache-Control"], "MaxAgeSeconds": 3600 }]
   ```
   Add every SITE origin you use (e.g. also `https://<project>.vercel.app`).
5. Optional, if you restored your local database: upload the existing files with the same paths, so old
   images keep working. Copy `Portfolio/backend/media/` into the bucket root (it contains `media/…` and
   `videos/…`), e.g. with rclone or `aws s3 sync Portfolio/backend/media s3://devsphere-media --endpoint-url <endpoint>`.

Video uploads go **straight from the browser to R2** with a presigned PUT URL (15 minutes, one key, exact
size). The API then checks the file. Images are uploaded through the API, which validates and re-encodes them.

## 3. Render (API)

1. **New → Blueprint** → choose the repo. Render reads `render.yaml` and creates **devsphere-api** (Docker,
   Virginia, health check `/api/health/`). `DJANGO_SECRET_KEY` is generated for you.
2. Fill the values it asks for:

   | Variable | Value |
   |---|---|
   | `DJANGO_ALLOWED_HOSTS` | `devsphere-api.onrender.com,www.yourdomain.com,<project>.vercel.app` |
   | `CSRF_TRUSTED_ORIGINS` | `https://www.yourdomain.com,https://<project>.vercel.app` |
   | `FRONTEND_ORIGINS` | same as `CSRF_TRUSTED_ORIGINS` |
   | `PUBLIC_SITE_URL` | `https://www.yourdomain.com` (used in link previews) |
   | `DATABASE_URL` | the Neon connection string |
   | `MEDIA_S3_BUCKET` | `devsphere-media` |
   | `MEDIA_S3_ENDPOINT_URL` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
   | `MEDIA_S3_ACCESS_KEY_ID` / `MEDIA_S3_SECRET_ACCESS_KEY` | the R2 token |
   | `MEDIA_S3_CUSTOM_DOMAIN` | `media.yourdomain.com` or `pub-xxxx.r2.dev` |
   | `CONTACT_NOTIFY_EMAIL` | `devsphere1130@gmail.com` |
   | `EMAIL_*`, `DEFAULT_FROM_EMAIL` | see **Email** below |

   Optional: `WHATSAPP_*` (Cloud API) from `backend/.env.production.example`. Never put secrets in the repo.
3. Deploy. With `MIGRATE_ON_START=1` (already set), each start runs `migrate` and `createcachetable` before
   gunicorn. A failed migration stops the deploy, so a half-migrated API never serves traffic.
4. Check `https://devsphere-api.onrender.com/api/health/` → `{"status": "ok", ...}`.

If Render shows a different URL than `devsphere-api.onrender.com` (the name was taken), change the two
`destination` URLs in `frontend/vercel.json` to match, and push.

**Free plan limits:** the service sleeps after 15 minutes without traffic. The first visit then waits up to
about a minute (Vercel's proxy allows 120 s). Optional: an uptime monitor calling `/api/health/` every 10–14
minutes keeps it awake. The free plan also has no shell or pre-deploy step; this setup doesn't need either.

### Email (important)

**Free option using only your Gmail (recommended):** a Google Apps Script sends the notification from your own
Gmail over HTTPS, which Render does not block. Create a script at script.google.com with the code from
`Portfolio/docs/gmail-relay.gs` (set its `SECRET`), deploy it as a **Web app** (*Execute as: Me*, *Who has
access: Anyone*), then set on Render: `CONTACT_NOTIFY_WEBHOOK_URL` = the web-app URL and
`CONTACT_NOTIFY_WEBHOOK_SECRET` = the same secret. Free limit: 100 emails a day. When the URL is set, SMTP is
not used.


Render's **free** web services block outgoing SMTP on ports 25, 465 and 587, so Gmail SMTP **won't send**
from there. Inquiries are still saved in the dashboard, but the notification email silently fails. Choose one:

- **Upgrade the service to a paid instance** (Starter): then Gmail works with the settings you use locally
  (`smtp.gmail.com`, port `587`, your app password).
- **Stay on free with an email service on port 2525**, e.g. Brevo (`smtp-relay.brevo.com`, port `2525`, TLS on,
  its SMTP login and key), SendGrid or Mailgun. Port 2525 isn't on Render's blocked list, but send a test inquiry
  to confirm. `DEFAULT_FROM_EMAIL` must be a sender address verified with that service.

## 4. Vercel (website)

1. **Add New → Project** → import the repo.
2. **Root Directory:** `Portfolio/frontend`. Framework preset **Vite** (build `npm run build`, output `dist`).
3. No environment variables are needed. The app calls `/api`, which `vercel.json` proxies to Render.
4. Deploy, then add your domain under **Settings → Domains**, and make sure it is listed in the Render
   variables and the R2 CORS rule (steps 2–3).

`vercel.json` also:
- sends link-preview bots (WhatsApp, Slack, LinkedIn, …) on `/work/<slug>` to Render's share page, so shared
  case studies show their title and image;
- serves `index.html` for every other route (`/about`, `/admin`, …);
- adds long-lived caching for `/assets` and basic security headers.

## 5. First-time data (only if you didn't restore a database)

Render's free plan has no shell, so run the one-off commands from your PC against Neon. Docker must be running.
The empty `DATABASE_HOST`/`DATABASE_PORT` switch off the local-database override:

```powershell
cd Portfolio
docker compose run --rm -e DATABASE_URL="<NEON_URL>" -e DATABASE_HOST= -e DATABASE_PORT= backend python manage.py seed_content
docker compose run --rm -e DATABASE_URL="<NEON_URL>" -e DATABASE_HOST= -e DATABASE_PORT= backend python manage.py bootstrap_admin
```

## 6. Check it works

- [ ] `SITE/api/health/` returns ok (through Vercel), and the home page shows your content.
- [ ] `SITE/admin` → sign in. On Safari too, since that confirms the first-party cookie setup.
- [ ] Upload an image in the media library; it loads from your R2 domain.
- [ ] Upload a short MP4 on a project's Videos tab; it reaches **Ready** (a CORS error means step 2.4).
- [ ] Submit the contact form; the inquiry appears in the dashboard and the email arrives (see **Email**).
- [ ] Paste a `SITE/work/<slug>` link into WhatsApp; the preview shows the project title.
- [ ] Optional: run `python manage.py check --deploy` with the production variables to catch misconfiguration.

## Updating later

Push to the main branch. Vercel and Render redeploy automatically, and migrations run on start. Back up Neon
before risky changes (Neon has point-in-time restore; `pg_dump "<NEON_URL>"` also works).
