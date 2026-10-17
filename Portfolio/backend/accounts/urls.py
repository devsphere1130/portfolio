from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChangePasswordView, CsrfView, LoginView, LogoutView, MeView, SessionViewSet, UserViewSet

router = DefaultRouter(trailing_slash=True)
router.register('sessions', SessionViewSet, basename='auth-session')

admin_router = DefaultRouter(trailing_slash=True)
admin_router.register('users', UserViewSet, basename='admin-user')

urlpatterns = [
    path('auth/csrf/', CsrfView.as_view(), name='auth-csrf'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/', include(router.urls)),
    path('admin/', include(admin_router.urls)),
]
