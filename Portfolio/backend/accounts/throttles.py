from rest_framework.throttling import SimpleRateThrottle


class LoginIPThrottle(SimpleRateThrottle):
    scope = 'login_ip'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class LoginEmailThrottle(SimpleRateThrottle):
    """Limits attempts per account, so rotating IPs cannot brute-force one mailbox."""

    scope = 'login_email'

    def get_cache_key(self, request, view):
        email = str(request.data.get('email', '')).strip().lower()
        if not email:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': email}
