"""Cache rules for public content (pages, projects, team, WhatsApp settings).

Browsers must revalidate every visit (`no-cache`), so a project published in the dashboard shows up on
the next page load. Only the hosting CDN (Vercel, which proxies /api) may keep a copy: it serves it
instantly and refreshes it in the background, which also hides the API host's cold start from
visitors. `Vercel-CDN-Cache-Control` is read by Vercel's CDN and never reaches the browser.

A copy is fresh for 60 seconds. After that Vercel still serves it (for up to a day, longer than the
API host's 15-minute sleep) and fetches a new one in the background, so a dashboard edit reaches
visitors about a minute later, one page load after the cache refreshes. If the API errors, the last
good copy is served for up to a day. cms.middleware.SharedCacheVaryMiddleware removes the
`Vary: Cookie` that would otherwise stop Vercel caching these responses.
"""

BROWSER = 'public, no-cache'
CDN = 'max-age=60, stale-while-revalidate=86400, stale-if-error=86400'


def public(response):
    response['Cache-Control'] = BROWSER
    response['Vercel-CDN-Cache-Control'] = CDN
    return response


def private(response):
    response['Cache-Control'] = 'private, no-store'
    return response
