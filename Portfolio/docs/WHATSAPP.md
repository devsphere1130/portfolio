# WhatsApp integration

Two independent modes. **Click-to-chat** needs no credentials and is all most sites need. The **Cloud API**
is optional and only becomes active when the official WhatsApp Business Platform credentials are configured
on the server.

## What works in each mode

| Feature | Click-to-chat (Mode A) | Cloud API (Mode B) |
|---|---|---|
| Floating WhatsApp button on every public page | ✅ | ✅ |
| "Chat on WhatsApp" on the Contact page (number shown only if you allow it) | ✅ | ✅ |
| "Ask about this project" / "Ask on WhatsApp" on projects, capabilities and services | ✅ | ✅ |
| "Continue on WhatsApp" after the contact form is saved | ✅ | ✅ |
| Admin "Open WhatsApp" to a lead (you send the draft yourself in WhatsApp) | ✅ | ✅ |
| Lead management: statuses, assignee, follow-ups, private notes, CSV export | ✅ | ✅ |
| Receive customers' WhatsApp messages in the dashboard | ❌ | ✅ (verified webhooks) |
| Reply from the dashboard | ❌ | ✅ (text, within WhatsApp's 24-hour window) |
| Sent / delivered / read / failed status | ❌ | ✅ (only as reported by WhatsApp) |
| Message counts in the overview | ❌ (not knowable) | ✅ (from API records only) |

**What click-to-chat can't do.** Opening a `wa.me` link doesn't send anything; the visitor reviews and sends
the message in their own WhatsApp. Those chats exist only in your WhatsApp app, so the website never claims a
message was sent, and nothing about them is recorded.

**Lead statuses are your own workflow.** New → Awaiting response → Contacted → Qualified → Converted, plus
Not qualified and Archived. They are not delivery receipts. "Mark as contacted" is your confirmation that you
reached the person.

## Set up click-to-chat (2 minutes)

1. Dashboard → **Leads & WhatsApp** → **WhatsApp settings**.
2. Enter the business number in international format (e.g. `+91 98765 43210`) and tick **Enable WhatsApp on
   the website**.
3. Choose which buttons appear. Optionally edit the pre-filled messages; each lists the placeholders it may
   use, so private data can't be inserted.
4. Press **Test link**, then **Save**. The site updates within about a minute (public content is cached for 60 s).

The number is part of every `wa.me` link, so anyone who opens one can see it. "Show the number as text" only
controls whether it is also printed on the Contact page.

## Optional: enable the WhatsApp Business Cloud API

You need a Meta Business account, a WhatsApp Business Account, a registered business phone number, and an
app with the WhatsApp product in Meta for Developers.

1. **Server secrets** (environment / secret manager, never the dashboard or the frontend):
   ```
   WHATSAPP_ACCESS_TOKEN=<permanent system-user token>
   WHATSAPP_APP_SECRET=<app secret, App settings → Basic>
   WHATSAPP_VERIFY_TOKEN=<a long random string you choose>
   WHATSAPP_API_VERSION=v23.0
   ```
   Restart the backend.
2. **Dashboard:** set **Integration mode** to *Click-to-chat + official WhatsApp Cloud API* and enter the
   **Phone number ID** (and Business Account ID) from WhatsApp Manager → API setup. The status panel lists
   anything still missing, by name only.
3. **Webhook in Meta:** callback URL `https://<your-api-domain>/api/webhooks/whatsapp/` (must be public
   HTTPS), verify token = `WHATSAPP_VERIFY_TOKEN`, then subscribe to the **messages** field.
4. Send a WhatsApp message to the business number. It appears under the matching lead when that lead's
   phone number is the same, and in the overview counts.

### How the API integration behaves

- **Webhook security:** `X-Hub-Signature-256` is verified as an HMAC-SHA256 of the exact raw body with the app
  secret, using a constant-time comparison. Invalid signatures get `401`. Without an app secret configured the
  endpoint returns `503`.
- **Idempotency:** each inbound message and each status change has a unique event key, so Meta's
  redeliveries are skipped. Every item is processed in its own transaction: if processing fails, the request
  returns `500` and Meta's retry is processed normally.
- **Statuses only move forward** (accepted → sent → delivered → read). A late "sent" never overwrites "read".
  Failures keep WhatsApp's error code and title.
- **Sending:** admin-only, rate-limited, text only, and only within 24 hours of the customer's last message
  (WhatsApp's customer service window). Outside it, WhatsApp requires an approved template from Meta's
  WhatsApp Manager. A successful API call is recorded as **Accepted**, never as delivered. Sends are never
  retried automatically, because a retry could message the person twice.
- **Privacy:** tokens are never logged or returned. Webhook diagnostics contain no message bodies.
  `python manage.py whatsapp_retention` deletes old webhook records (run it daily; default 30 days via
  `WHATSAPP_EVENT_RETENTION_DAYS`).
- **Policy:** don't send marketing or unsolicited messages. Clicking a WhatsApp button is not consent to
  marketing. Get opt-in for proactive messages and honour opt-outs.

### Testing without Meta or real customers

```bash
# backend/.env: WHATSAPP_APP_SECRET=any-test-value   (development only)
python manage.py whatsapp_simulate_webhook --kind message --from 15550100199 --text "Hello"
python manage.py whatsapp_simulate_webhook --kind status --wamid <wamid of a message you sent> --status delivered
```

The command signs a sample payload exactly as Meta does and posts it to your own server. It refuses to run in
production. Use numbers from the fictional `+1 555 010 0xxx` range.

## API reference

| Endpoint | Access |
|---|---|
| `GET /api/public/whatsapp/` (also inside `/api/public/content/`) | public: enabled flag, number digits for links, button switches, message templates |
| `POST /api/contact/` (+ optional `phone_number`, `related_project`, `related_capability`) | public, rate-limited |
| `GET/PATCH /api/admin/whatsapp/settings/` | admin |
| `GET /api/admin/whatsapp/overview/` | admin |
| `GET/PATCH /api/admin/inquiries/`, `…/<id>/notes/`, `…/<id>/mark-contacted/`, `…/export/` | admin |
| `GET/POST /api/admin/inquiries/<id>/whatsapp/` | admin; send requires the Cloud API |
| `GET/POST /api/webhooks/whatsapp/` | Meta only (verify token / signature) |

## Tests

- **Backend:** `python manage.py test whatsapp` (32 tests) covers public settings without secrets,
  permissions, phone and template validation, contact form links, lead management and CSV export,
  webhook verification and signatures, duplicate events, status ordering, failures, the 24-hour window, API
  and network errors, and retention.
- **Frontend:** `npm test` checks link building and URL encoding (including emoji and non-Latin scripts).
