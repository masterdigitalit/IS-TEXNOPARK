from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.hashers import make_password
from django.utils.translation import gettext_lazy as _
from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = (
            'email', 'password', 'password_confirm', 
            'first_name', 'middle_name', 'last_name',
            'phone', 'avatar_url', 'role'
        )
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True, 'error_messages': {'required': _('Имя обязательно для заполнения')}},
            'middle_name': {'required': True, 'error_messages': {'required': _('Фамилия обязательна для заполнения')}},
            'last_name': {'required': False},
            'phone': {'required': False},
            'avatar_url': {'required': False},
            'role': {'required': False, 'default': 'user'},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {"password": _("Пароли не совпадают.")}
            )
        
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError(
                {"email": _("Пользователь с таким email уже существует.")}
            )
        
        if attrs.get('phone') and User.objects.filter(phone=attrs['phone']).exists():
            raise serializers.ValidationError(
                {"phone": _("Пользователь с таким телефоном уже существует.")}
            )
        
        # Не позволяем регистрироваться как admin
        if attrs.get('role') == 'admin':
            raise serializers.ValidationError(
                {"role": _("Регистрация с ролью администратора запрещена.")}
            )
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create(
            **validated_data,
            password=make_password(password)
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    short_name = serializers.SerializerMethodField()
    created_at_formatted = serializers.SerializerMethodField()
    last_login_at_formatted = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'middle_name', 'last_name',
            'full_name', 'short_name', 'role', 'role_display',
            'phone', 'avatar_url', 'is_verified',
            'created_at', 'created_at_formatted',
            'last_login', 'last_login_at_formatted',
            'permissions', 'is_active', 'is_staff', 'is_superuser'
        )
        read_only_fields = (
            'id', 'created_at', 'last_login', 
            'is_staff', 'is_superuser', 'permissions',
            'full_name', 'short_name', 'role_display',
            'created_at_formatted', 'last_login_at_formatted',
            'is_verified'
        )
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
        }

    def get_full_name(self, obj):
        return obj.full_name

    def get_short_name(self, obj):
        return obj.short_name

    def get_created_at_formatted(self, obj):
        if obj.created_at:
            return obj.created_at.strftime("%d.%m.%Y %H:%M")
        return None

    def get_last_login_at_formatted(self, obj):
        if obj.last_login:
            return obj.last_login.strftime("%d.%m.%Y %H:%M")
        return None

    def get_role_display(self, obj):
        return obj.get_role_display()

    def get_permissions(self, obj):
        base_permissions = ['view_profile', 'edit_profile']
        
        role_permissions = {
            'admin': ['manage_users', 'view_admin_panel', 'manage_events', 'view_reports'],
            'user': ['view_events', 'participate_events', 'rate_events', 'view_results']
        }
        
        permissions = base_permissions.copy()
        if obj.role in role_permissions:
            permissions.extend(role_permissions[obj.role])
        
        if obj.is_staff:
            permissions.append('admin_panel')
        if obj.is_superuser:
            permissions.append('superuser')
        
        return permissions


class UserUpdateSerializer(serializers.ModelSerializer):
    current_password = serializers.CharField(
        write_only=True, 
        required=False,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        write_only=True, 
        required=False,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        write_only=True, 
        required=False,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = (
            'first_name', 'middle_name', 'last_name',
            'phone', 'avatar_url', 'role',
            'current_password', 'new_password', 'new_password_confirm',
            'is_active'
        )
        extra_kwargs = {
            'first_name': {'required': False},
            'middle_name': {'required': False},
            'last_name': {'required': False},
            'phone': {'required': False},
            'avatar_url': {'required': False},
            'role': {'required': False},
            'is_active': {'required': False},
        }

    def validate(self, attrs):
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')
        current_password = attrs.get('current_password')
        
        if new_password or new_password_confirm or current_password:
            if not all([new_password, new_password_confirm, current_password]):
                raise serializers.ValidationError({
                    "password": _("Для смены пароля необходимо заполнить все три поля.")
                })
            
            if new_password != new_password_confirm:
                raise serializers.ValidationError({
                    "new_password": _("Новый пароль и подтверждение не совпадают.")
                })
        
        return attrs

    def update(self, instance, validated_data):
        current_password = validated_data.pop('current_password', None)
        new_password = validated_data.pop('new_password', None)
        validated_data.pop('new_password_confirm', None)
        
        if current_password and new_password:
            if not instance.check_password(current_password):
                raise serializers.ValidationError({
                    "current_password": _("Неверный текущий пароль.")
                })
            instance.set_password(new_password)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class UserListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    short_name = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'email', 'full_name', 'short_name', 
            'role', 'role_display', 'phone', 
            'created_at', 'last_login', 'is_active',
            'avatar_url'
        )
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.full_name

    def get_short_name(self, obj):
        return obj.short_name

    def get_role_display(self, obj):
        return obj.get_role_display()


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True, error_messages={
        'required': _('Email обязателен для заполнения'),
        'invalid': _('Введите корректный email адрес')
    })
    password = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'},
        error_messages={'required': _('Пароль обязателен для заполнения')}
    )
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                "email": _("Пользователь с таким email не найден.")
            })
        
        if not user.check_password(password):
            raise serializers.ValidationError({
                "password": _("Неверный пароль.")
            })
        
        if not user.is_active:
            raise serializers.ValidationError({
                "email": _("Аккаунт отключен.")
            })
        
        attrs['user'] = user
        return attrs


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField(
        required=True, 
        error_messages={
            'required': _('Email обязателен для заполнения'),
            'invalid': _('Введите корректный email адрес')
        }
    )
    
    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError(_("Пользователь с таким email не найден."))
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        write_only=True, 
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
        error_messages={'required': _('Новый пароль обязателен')}
    )
    new_password_confirm = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'},
        error_messages={'required': _('Подтверждение пароля обязательно')}
    )
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                "new_password": _("Пароли не совпадают.")
            })
        return attrs


class AvatarUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('avatar_url',)
        extra_kwargs = {
            'avatar_url': {'required': True}
        }


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    short_name = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'full_name', 'short_name', 
            'avatar_url', 'role', 'role_display',
            'created_at'
        )
        read_only_fields = fields
    
    def get_full_name(self, obj):
        return obj.full_name
    
    def get_short_name(self, obj):
        return obj.short_name
    
    def get_role_display(self, obj):
        return obj.get_role_display()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'},
        error_messages={'required': _('Старый пароль обязателен')}
    )
    new_password = serializers.CharField(
        write_only=True, 
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
        error_messages={'required': _('Новый пароль обязателен')}
    )
    new_password_confirm = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'},
        error_messages={'required': _('Подтверждение пароля обязательно')}
    )
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                "new_password": _("Новый пароль и подтверждение не совпадают.")
            })
        
        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({
                "new_password": _("Новый пароль должен отличаться от старого.")
            })
        
        return attrs


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    uid = serializers.CharField(required=True)