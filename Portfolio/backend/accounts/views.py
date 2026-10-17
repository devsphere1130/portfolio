from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cms.audit import record

from .models import AuthSession, User, hash_session_key
from .permissions import IsAdminRole
from .serializers import (
    AuthSessionSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    ManagedUserSerializer,
    UserSerializer,
)
from .throttles import LoginEmailThrottle, LoginIPThrottle

INVALID_LOGIN = 'Incorrect email or password.'


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfView(APIView):
    """Returns a CSRF token in JSON as well as the cookie, so cross-origin SPAs can send it back."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'csrfToken': get_token(request)})


@method_decorator(csrf_protect, name='dispatch')  # DRF skips CSRF for anonymous users; login needs it
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginIPThrottle, LoginEmailThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()
        user = authenticate(request, username=email, password=serializer.validated_data['password'])
        if user is None or user.role not in User.Role.values:
            record(None, 'auth.login_failed', 'user', None, f'Failed sign-in for {email}', {'email': email}, request=request)
            # One message for unknown email, wrong password and inactive account: no user enumeration.
            return Response({'detail': INVALID_LOGIN}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)  # rotates the session key and fires user_logged_in (AuthSession + last_login)
        record(user, 'auth.login', 'user', user.pk, 'Signed in', request=request)
        return Response({'user': UserSerializer(user).data, 'csrfToken': get_token(request)})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        record(request.user, 'auth.logout', 'user', request.user.pk, 'Signed out', request=request)
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """Current session. Returns `{user: null}` instead of 401 so the SPA can branch cheaply."""

    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if request.user.is_authenticated else None
        return Response({'user': UserSerializer(user).data if user else None})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password', 'updated_at'])
        old_hash = hash_session_key(request.session.session_key)
        update_session_auth_hash(request, user)  # rotates the session key
        new_hash = hash_session_key(request.session.session_key)
        # Keep this browser signed in (re-key its row) and sign every other session out.
        AuthSession.objects.filter(session_token_hash=old_hash).update(session_token_hash=new_hash)
        AuthSession.objects.filter(user=user, revoked_at__isnull=True).exclude(session_token_hash=new_hash).update(
            revoked_at=timezone.now()
        )
        record(user, 'auth.password_changed', 'user', user.pk, 'Changed password', request=request)
        return Response({'detail': 'Password changed. Other sessions were signed out.', 'csrfToken': get_token(request)})


class SessionViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """The signed-in user's own sessions, with revoke and sign-out-everywhere-else."""

    permission_classes = [IsAuthenticated]
    serializer_class = AuthSessionSerializer
    pagination_class = None

    def get_queryset(self):
        return AuthSession.objects.filter(user=self.request.user, revoked_at__isnull=True, expires_at__gt=timezone.now())

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'current_hash': hash_session_key(self.request.session.session_key or '')}

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        session = self.get_queryset().filter(pk=pk).first()
        if session is None:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
        session.revoke()
        record(request.user, 'auth.session_revoked', 'auth_session', session.pk, 'Revoked a session', request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='revoke-others')
    def revoke_others(self, request):
        current = hash_session_key(request.session.session_key)
        count = self.get_queryset().exclude(session_token_hash=current).update(revoked_at=timezone.now())
        record(request.user, 'auth.sessions_revoked', 'user', request.user.pk, f'Signed out {count} other session(s)', request=request)
        return Response({'revoked': count})


class UserViewSet(viewsets.ModelViewSet):
    """Admin-only account management. There is no public registration endpoint."""

    permission_classes = [IsAdminRole]
    serializer_class = ManagedUserSerializer
    queryset = User.objects.all()
    search_fields = ['name', 'email']
    ordering_fields = ['email', 'name', 'created_at', 'last_login']
    http_method_names = ['get', 'post', 'patch', 'delete']

    def _would_remove_last_admin(self, user, data=None):
        data = data or {}
        losing_admin = data.get('role', user.role) != User.Role.ADMIN or data.get('is_active', user.is_active) is False
        if user.role != User.Role.ADMIN or not losing_admin:
            return False
        return not User.objects.filter(role=User.Role.ADMIN, is_active=True).exclude(pk=user.pk).exists()

    def perform_create(self, serializer):
        user = serializer.save()
        record(self.request.user, 'user.created', 'user', user.pk, f'Created {user.role} {user.email}', request=self.request)

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        if self._would_remove_last_admin(user, request.data):
            return Response({'detail': 'At least one active admin must remain.'}, status=status.HTTP_400_BAD_REQUEST)
        response = super().update(request, *args, **kwargs)
        if request.data.get('is_active') is False:
            AuthSession.objects.filter(user=user, revoked_at__isnull=True).update(revoked_at=timezone.now())
        record(request.user, 'user.updated', 'user', user.pk, f'Updated {user.email}',
               {'fields': sorted(k for k in request.data if k != 'password')}, request=request)
        return response

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response({'detail': 'You cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        if self._would_remove_last_admin(user, {'is_active': False}):
            return Response({'detail': 'At least one active admin must remain.'}, status=status.HTTP_400_BAD_REQUEST)
        record(request.user, 'user.deleted', 'user', user.pk, f'Deleted {user.email}', request=request)
        return super().destroy(request, *args, **kwargs)
