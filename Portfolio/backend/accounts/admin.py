from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AuthSession, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ['email']
    list_display = ['email', 'name', 'role', 'is_active', 'last_login']
    list_filter = ['role', 'is_active']
    search_fields = ['email', 'name']
    readonly_fields = ['last_login', 'created_at', 'updated_at']
    fieldsets = [
        (None, {'fields': ['email', 'name', 'password']}),
        ('Access', {'fields': ['role', 'is_active', 'is_staff', 'is_superuser']}),
        ('Dates', {'fields': ['last_login', 'created_at', 'updated_at']}),
    ]
    add_fieldsets = [(None, {'classes': ['wide'], 'fields': ['email', 'name', 'role', 'password1', 'password2']})]


@admin.register(AuthSession)
class AuthSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'ip_address', 'created_at', 'last_seen_at', 'expires_at', 'revoked_at']
    list_filter = ['revoked_at']
    readonly_fields = [f.name for f in AuthSession._meta.fields]
