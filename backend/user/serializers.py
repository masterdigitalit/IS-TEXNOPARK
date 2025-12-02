from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.hashers import make_password
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
            'email', 'password', 'password_confirm', 'first_name', 
            'middle_name', 'last_name', 'phone', 'avatar_url', 'role'
        )
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
            'phone': {'required': False},
            'avatar_url': {'required': False},
            'middle_name': {'required': False},
            'role': {'required': False, 'default': 'user'},
        }

    def validate(self, attrs):
        # Проверка совпадения паролей
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {"password": "Пароли не совпадают."}
            )
        
        # Проверка уникальности email
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError(
                {"email": "Пользователь с таким email уже существует."}
            )
        
        # Проверка уникальности телефона (если предоставлен)
        if attrs.get('phone') and User.objects.filter(phone=attrs['phone']).exists():
            raise serializers.ValidationError(
                {"phone": "Пользователь с таким телефоном уже существует."}
            )
        
        return attrs

    def create(self, validated_data):
        # Удаляем подтверждение пароля
        validated_data.pop('password_confirm')
        
        # Хешируем пароль
        password = validated_data.pop('password')
        
        # Создаем пользователя
        user = User.objects.create(
            **validated_data,
            password=make_password(password)
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    # Вычисляемое поле для полного имени
    full_name = serializers.SerializerMethodField()
    
    # Вычисляемое поле для отображения даты в удобном формате
    created_at_formatted = serializers.SerializerMethodField()
    last_login_at_formatted = serializers.SerializerMethodField()
    
    # Права доступа в зависимости от роли
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'middle_name', 'last_name',
            'full_name', 'role', 'phone', 'avatar_url',
            'created_at', 'created_at_formatted',
            'last_login_at', 'last_login_at_formatted',
            'permissions', 'is_active', 'is_staff', 'is_superuser'
        )
        read_only_fields = (
            'id', 'created_at', 'last_login_at', 
            'is_staff', 'is_superuser', 'permissions'
        )
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
        }

    def get_full_name(self, obj):
        """Полное имя пользователя (ФИО)"""
        return obj.get_full_name()

    def get_created_at_formatted(self, obj):
        """Форматированная дата создания"""
        if obj.created_at:
            return obj.created_at.strftime("%d.%m.%Y %H:%M")
        return None

    def get_last_login_at_formatted(self, obj):
        """Форматированная дата последнего входа"""
        if obj.last_login_at:
            return obj.last_login_at.strftime("%d.%m.%Y %H:%M")
        return None

    def get_permissions(self, obj):
        """Права доступа в зависимости от роли"""
        # Базовые права для всех пользователей
        base_permissions = ['view_profile', 'edit_profile']
        

        
        permissions = base_permissions.copy()
        if obj.role in role_permissions:
            permissions.extend(role_permissions[obj.role])
        
        # Добавляем права Django
        if obj.is_staff:
            permissions.append('admin_panel')
        if obj.is_superuser:
            permissions.append('superuser')
        
        return permissions


class UserUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления пользователя"""
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

    class Meta:
        model = User
        fields = (
            'first_name', 'middle_name', 'last_name',
            'phone', 'avatar_url', 'role',
            'current_password', 'new_password',
            'is_active'
        )
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
            'middle_name': {'required': False},
            'phone': {'required': False},
            'avatar_url': {'required': False},
            'role': {'required': False},
            'is_active': {'required': False},
        }

    def validate(self, attrs):
        # Проверка для смены пароля
        new_password = attrs.get('new_password')
        current_password = attrs.get('current_password')
        
        if new_password and not current_password:
            raise serializers.ValidationError(
                {"current_password": "Требуется текущий пароль для смены пароля."}
            )
        
        if current_password and not new_password:
            raise serializers.ValidationError(
                {"new_password": "Требуется новый пароль для смены пароля."}
            )
        
        return attrs

    def update(self, instance, validated_data):
        # Обработка смены пароля
        current_password = validated_data.pop('current_password', None)
        new_password = validated_data.pop('new_password', None)
        
        if current_password and new_password:
            # Проверяем текущий пароль
            if not instance.check_password(current_password):
                raise serializers.ValidationError(
                    {"current_password": "Неверный текущий пароль."}
                )
            # Устанавливаем новый пароль
            instance.set_password(new_password)
        
        # Обновляем остальные поля
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class UserListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка пользователей"""
    full_name = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'email', 'full_name', 'role', 'role_display',
            'phone', 'created_at', 'last_login_at', 'is_active'
        )
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_role_display(self, obj):
        """Отображаемое название роли"""
        return obj.get_role_display()


class UserLoginSerializer(serializers.Serializer):
    """Сериализатор для входа пользователя"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        # Проверка существования пользователя
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {"email": "Пользователь с таким email не найден."}
            )
        
        # Проверка пароля
        if not user.check_password(password):
            raise serializers.ValidationError(
                {"password": "Неверный пароль."}
            )
        
        # Проверка активности аккаунта
        if not user.is_active:
            raise serializers.ValidationError(
                {"email": "Аккаунт отключен. Обратитесь к администратору."}
            )
        
        attrs['user'] = user
        return attrs


class PasswordResetSerializer(serializers.Serializer):
    """Сериализатор для сброса пароля"""
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Сериализатор для подтверждения сброса пароля"""
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True, 
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError(
                {"new_password": "Пароли не совпадают."}
            )
        return attrs


class AvatarUploadSerializer(serializers.ModelSerializer):
    """Сериализатор для загрузки аватара"""
    class Meta:
        model = User
        fields = ('avatar_url',)


class UserProfileSerializer(serializers.ModelSerializer):
    """Сериализатор для профиля пользователя (публичные данные)"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'full_name', 'avatar_url', 'role',
            'created_at'
        )
        read_only_fields = fields
    
    def get_full_name(self, obj):
        return obj.get_full_name()