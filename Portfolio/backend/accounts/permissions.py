from rest_framework.permissions import BasePermission

from .models import User


class IsDashboardUser(BasePermission):
    """Any active admin or editor. Used for content and media management."""

    message = 'You need to be signed in to the dashboard.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and user.role in User.Role.values)


class IsAdminRole(BasePermission):
    """Admins only: site settings, users, inquiries and the activity log."""

    message = 'Only administrators can do this.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_admin)
