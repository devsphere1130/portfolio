class SharedCacheVaryMiddleware:
    """
    Lets Vercel's CDN cache the public content responses (see cms/caching.py).

    AuthSessionMiddleware reads the session on every request, so Django adds `Vary: Cookie` to every
    response, and Vercel never caches a response that varies on Cookie. Responses marked public by
    cms.caching.public() are the same for every visitor (preview data is only ever sent `private`),
    so `Cookie` is dropped from their Vary header only. Every other response keeps it.

    Must sit above SessionMiddleware so it runs after the session adds the header.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        shared = response.has_header('Vercel-CDN-Cache-Control') and not response.cookies
        # Keep ?preview=1 out of the shared cache, so an editor's preview link never gets a cached public copy.
        if shared and 'preview' not in request.GET and response.has_header('Vary'):
            vary = [v.strip() for v in response['Vary'].split(',') if v.strip() and v.strip().lower() != 'cookie']
            if vary:
                response['Vary'] = ', '.join(vary)
            else:
                del response['Vary']
        return response
