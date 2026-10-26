"""Cache rules for public content (pages, projects, team, WhatsApp settings).

Browsers must revalidate every visit (`no-cache`), so a project published in the dashboard shows up on
the next page load. Only the hosting CDN (Vercel, which proxies /api) may keep a copy: it serves it
instantly and refreshes it in the background, which also hides the API host's cold start from
visitors. `Vercel-CDN-Cache-Control` is read by Vercel's CDN and never reaches the browser.
"""

BROWSER = 'public, no-cache'
CDN = 'max-age=10, stale-while-revalidate=600'


def public(response):
    response['Cache-Control'] = BROWSER
    response['Vercel-CDN-Cache-Control'] = CDN
    return response


def private(response):
    response['Cache-Control'] = 'private, no-store'
    return response
