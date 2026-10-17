from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import AuthSession, User


class UserSerializer(serializers.ModelSerializer):
    last_login_at = serializers.DateTimeField(source='last_login', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'is_active', 'last_login_at', 'created_at']
        read_only_fields = fields


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=256, trim_whitespace=False)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(max_length=256, trim_whitespace=False)
    new_password = serializers.CharField(max_length=256, trim_whitespace=False)

    def validate(self, attrs):
        user = self.context['request'].user
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError({'current_password': 'Your current password is incorrect.'})
        validate_password(attrs['new_password'], user)
        return attrs


class AuthSessionSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = AuthSession
        fields = ['id', 'ip_address', 'user_agent', 'created_at', 'last_seen_at', 'expires_at', 'revoked_at', 'is_current']

    def get_is_current(self, obj):
        return obj.session_token_hash == self.context.get('current_hash')


class ManagedUserSerializer(serializers.ModelSerializer):
    """Admin-only user management. Roles are set here by an admin, never by the user themselves."""

    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)
    last_login_at = serializers.DateTimeField(source='last_login', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'is_active', 'password', 'last_login_at', 'created_at']
        read_only_fields = ['id', 'last_login_at', 'created_at']

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        password = attrs.get('password')
        if self.instance is None and not password:
            raise serializers.ValidationError({'password': 'Set an initial password for the new account.'})
        if password:
            candidate = self.instance or User(email=attrs.get('email', ''), name=attrs.get('name', ''))
            validate_password(password, candidate)
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
