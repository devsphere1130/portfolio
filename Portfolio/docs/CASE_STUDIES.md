# Project case studies

Every published project has its own page at **`/work/<slug>`**, built from the database. Clicking a project card
(or its **View Case Study** button) on the home page or `/projects` opens it.

## What a case study shows

Sections appear only when they have published content. Nothing is padded with placeholders:

| Section | Comes from (dashboard → Projects → a project) | Shown when |
|---|---|---|
| Hero | General + Hero & media tabs: title, category, status badge, summary, intro, badges, role, duration, client, dates, live/source links, hero image | always |
| Overview | Overview tab | overview or "Built for" text exists |
| What we built | What we built tab (title, explanation, detail, screenshot or video) | ≥ 1 published item |
| Gallery | Gallery tab (images, captions, alt text, categories, order) | ≥ 1 published image |
| Demo video | Videos tab | ≥ 1 published, validated video |
| Problem → solution | Problem → solution tab (challenge, approach, solution, result + optional images) | per block with text |
| Key features | Features tab | ≥ 1 published feature |
| Technology | Technology tab (from the shared Tech stack list, with a project note) | ≥ 1 entry |
| Outcomes | Outcomes tab | ≥ 1 **verified** and published result |
| Call to action | Start a Project (`/contact?project=<slug>`, links the inquiry to the project), Ask on WhatsApp (if enabled in WhatsApp settings), Contact | always; unavailable buttons are hidden |
| Related projects | Related tab; otherwise published projects in the same category | ≥ 1 published match |

Section numbers (`[ 01 ]`, `[ 02 ]` …) follow what is actually shown.

**Privacy defaults.** The client name is shown only when "client approved being named" is ticked, and the
repository link only when "show the repository link publicly" is ticked. Outcome verification notes are never
public. Outcomes can't be published until they are marked verified (enforced in the API and the database).

## Editing workflow

1. **Projects → New Project**, fill the General tab and press **Create draft**.
2. Fill the other tabs. Text fields are saved with **Save** (the header shows *Unsaved changes*, and the browser
   warns before leaving). List tabs (gallery, videos, build components, features, outcomes, technology) save each
   change immediately.
3. **Preview** opens `/work/<slug>?preview=1`. It works for drafts while you are signed in.
4. **Publishing tab**: Publish, Unpublish (back to draft) or Archive. It also lists which sections will appear.

Every item has its own **Show/Hide** switch. Publishing a project never requires a video. Public pages are
cached for up to 60 seconds, so changes can take a minute to appear.

### Text formatting

Content is plain text (HTML is rejected). In the overview, technical details and story blocks, leave a blank
line between paragraphs, and start lines with `- ` to make a bulleted list.

### Images

Upload several at once (or drag them onto the Gallery tab), or choose from the media library. Every image is
decoded, size-limited (`MEDIA_MAX_UPLOAD_MB`, 40 megapixels), resized to at most 2400 px, re-encoded to WebP and
stripped of metadata. **Replace** swaps a gallery item's image and keeps the old one in the library. An image
that is still used anywhere can't be deleted from the library.

## Videos

| | |
|---|---|
| Format | **MP4 with H.264 video and AAC audio** (plays in every browser). AV1/VP9 in MP4 are accepted; HEVC, QuickTime `.mov` and other audio codecs are rejected with a clear message. Nothing is transcoded. |
| Limits | `VIDEO_MAX_UPLOAD_MB` (300), `VIDEO_MAX_DURATION_SECONDS` (1800), `VIDEO_MAX_WIDTH`×`VIDEO_MAX_HEIGHT` (3840×2160) |
| Checks | The server reads the MP4 structure itself (codec, duration, resolution, real media data). The declared file type and name are ignored. |
| Captions | WebVTT (`.vtt`), UTF-8, ≤ 512 KB |
| Links | YouTube and Vimeo only (`VIDEO_EXTERNAL_PROVIDERS`). Only the video id is stored; the privacy-friendly embed URL (`youtube-nocookie.com`, Vimeo `dnt=1`) is built by the server. Editors can't paste embed HTML. |

A video goes **Waiting for the file → Ready** (or **Rejected**, with the reason). It can only be published when
Ready (enforced in the database too). A rejected replacement keeps the previous file live. Removing a video, or
the project, deletes its files from storage once the change is committed.

On the public page the player is **play-to-load**: no video file or YouTube/Vimeo player is downloaded until the
visitor presses play. The primary video is shown first, and other published videos are listed beside it.

### How uploads reach storage

- **`MEDIA_STORAGE=local`** (development, or one server with the `media` volume): the browser posts the file to
  Django (`…/videos/<id>/file/`) with a progress bar. In production nginx buffers the body to disk before passing
  it on (`client_max_body_size 320m` in `frontend/nginx.conf`; keep it a little above `VIDEO_MAX_UPLOAD_MB`).
  Files live in the media volume, never in PostgreSQL, so they survive container rebuilds.
- **`MEDIA_STORAGE=s3`** (recommended in production; AWS S3 or Cloudflare R2): the server returns a short-lived
  **presigned PUT URL** (`VIDEO_DIRECT_UPLOAD_EXPIRY_SECONDS`, 15 min) for one random key, signed for `video/mp4`
  and the file's exact size, so the bucket rejects anything else. The browser uploads straight to the bucket, then
  the server reads the stored object with ranged requests and validates it; invalid objects are deleted. (PUT, not
  a POST form, because R2 doesn't support presigned POST.) The bucket needs a CORS rule for the site's origin:

  ```json
  [{ "AllowedOrigins": ["https://www.example.com"], "AllowedMethods": ["PUT", "GET", "HEAD"],
     "AllowedHeaders": ["Content-Type", "Cache-Control"], "MaxAgeSeconds": 3600 }]
  ```
  `GET` is needed because caption files from another origin are loaded with CORS. Objects must be publicly
  readable through the bucket's public domain (`MEDIA_S3_CUSTOM_DOMAIN`), like images.

## Link previews and SEO

The page sets its own title, description, canonical URL and Open Graph image. Search engines that run
JavaScript read these. Link-preview crawlers (WhatsApp, Slack, LinkedIn, X, Facebook, Discord, Telegram…) don't
run JavaScript, so production nginx sends only those user agents to
`/api/public/share/work/<slug>/`. That endpoint returns the same tags as server-rendered HTML.

Set **`PUBLIC_SITE_URL`** (e.g. `https://www.example.com`) so those tags use the right canonical URL.
`manage.py check --deploy` warns (`devsphere.W022`) when it is missing.

**Vercel frontend:** `frontend/vercel.json` already contains the same user-agent rule, pointing at the Render
API (see [DEPLOY.md](DEPLOY.md)).

## API

Public (published content only; `?preview=1` works for signed-in editors):

| | |
|---|---|
| `GET /api/public/projects/` | card data; add `?page=1&page_size=20` to paginate |
| `GET /api/public/projects/<slug>/` | the full case study (published children only, nothing private) |
| `GET /api/public/share/work/<slug>/` | HTML meta tags for link-preview crawlers |

Admin (signed-in editors and admins; CSRF required):

| | |
|---|---|
| `GET/POST /api/admin/projects/`, `GET/PATCH/DELETE …/<id>/` | projects (`?status=draft|published|archived`) |
| `POST …/projects/<id>/publish/`, `unpublish/`, `archive/` | status |
| `…/projects/<id>/gallery/` `videos/` `build-components/` `features/` `outcomes/` `stack/` | list / create |
| `…/<kind>/<item_id>/` | get / patch / delete |
| `…/<kind>/reorder/` | `{"ids": [...]}` in the new order |
| `…/gallery/bulk-delete/` | `{"ids": [...]}` |
| `…/videos/<id>/upload/` → `file/` or (S3) `complete/` | upload flow |
| `…/videos/<id>/captions/` (POST file / DELETE), `publish/`, `unpublish/` | video actions |

Every child endpoint is scoped by the project id in the URL: an item from another project returns 404, and the
project in a request body is ignored. Uploads use the `upload` throttle (`UPLOAD_THROTTLE_RATE`). Every change is
written to the activity log.

## Tests

```bash
docker compose exec backend python manage.py test cms.test_case_studies   # visibility, scoping, video + S3 flows
cd frontend && npm test                                                    # gallery wrap, stack grouping, text blocks…
```

The backend tests build small synthetic MP4 files to check the container parser (codecs, QuickTime,
HEVC, truncated files, limits). The S3 flow is tested against a mocked bucket client.

## Troubleshooting

- **"HEVC (H.265) video does not play in most browsers"**: re-export as H.264 (HandBrake preset *Fast 1080p30*,
  or `ffmpeg -i in.mov -c:v libx264 -crf 22 -c:a aac -movflags +faststart out.mp4`).
- **Upload fails at ~10 MB in production (local storage)**: you're probably hitting a proxy limit in front of nginx; raise it
  for `/api/admin/projects/*/videos/*/file/`.
- **Direct upload fails immediately**: the bucket CORS rule is missing the site origin, `PUT`, or the `Content-Type`/`Cache-Control` headers.
- **Captions don't appear (S3)**: CORS must allow `GET` from the site origin.
- **A section is missing**: open the Publishing tab and check its count. Hidden items show *not published*.
