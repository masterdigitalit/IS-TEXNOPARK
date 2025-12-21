from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
class UserManager(BaseUserManager):
    def create_user(self, email, password, role='admin', **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        if not password:
            raise ValueError('The Password must be set')
        
        email = self.normalize_email(email)
        user = self.model(
            email=email,
            role=role,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_verified', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
            
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    """Модель пользователя с расширенными полями"""
    
    email = models.EmailField(
        _('email'),
        unique=True,
        error_messages={
            'unique': _("Пользователь с таким email уже существует."),
        },
    )
    

 
    # Дополнительные поля ФИО согласно вашей схеме
    first_name = models.CharField(
        _('имя'),
        max_length=150,
        blank=True,
        null=True
    )
    
    middle_name = models.CharField(
        _('фамилия'),
        max_length=150,
        blank=True,
        null=True
    )
    
    last_name = models.CharField(
        _('отчество'),
        max_length=150,
        blank=True,
        null=True
    )
    
    created_at = models.DateTimeField(
        _('дата создания'),
        auto_now_add=True
    )
    
    # Роль пользователя
    ROLE_CHOICES = [
        ('admin', 'Админ'),
        ('user', 'Пользователь')

    ]
    
    role = models.CharField(
        _('роль'),
        max_length=20,
        choices=ROLE_CHOICES,
        default='user'
    )
    
    # Телефон
    phone = models.CharField(
        _('телефон'),
        max_length=20,
        blank=True,
        null=True,
        unique=True,
        error_messages={
            'unique': _("Пользователь с таким телефоном уже существует."),
        }
    )
    
    # URL аватара
    avatar_url = models.URLField(
        _('URL аватара'),
        max_length=500,
        blank=True,
        null=True
    )
    
    # Подтверждение пользователя
    is_verified = models.BooleanField(
        _('подтвержден'),
        default=False
    )
    
    # Поля из AbstractBaseUser/PermissionsMixin
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Designates whether the user can log into this admin site.'),
    )
    
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
    )
    
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)
    
    # Указываем custom related_name для избежания конфликтов
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name=_('groups'),
        blank=True,
        help_text=_(
            'The groups this user belongs to. A user will get all permissions '
            'granted to each of their groups.'
        ),
        related_name='custom_user_set',  # Добавлено
        related_query_name='user',
    )
    
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name=_('user permissions'),
        blank=True,
        help_text=_('Specific permissions for this user.'),
        related_name='custom_user_set',  # Добавлено
        related_query_name='user',
    )
    
    # Указываем, что поле email используется для аутентификации вместо username
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # Поля, требуемые при создании суперпользователя
    
    objects = UserManager()
    
    # Метаданные
    class Meta:
        verbose_name = _('пользователь')
        verbose_name_plural = _('пользователи')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
            models.Index(fields=['role']),
            models.Index(fields=['created_at']),
            models.Index(fields=['last_name', 'first_name']),
            
        ]



    def set_password(self, raw_password):
        self.password = make_password(raw_password)
    
    def check_password(self, raw_password):
        return check_password(raw_password, self.password)
    
    def __str__(self):
        """Строковое представление пользователя"""
        if self.get_full_name():
            return self.get_full_name()
        return self.email
    
    def get_full_name(self):
        """Полное ФИО в порядке: Фамилия Имя Отчество"""
        full_name = []
        if self.middle_name:  # Фамилия
            full_name.append(self.middle_name)
        if self.first_name:   # Имя
            full_name.append(self.first_name)
        if self.last_name:    # Отчество
            full_name.append(self.last_name)
        return " ".join(full_name) if full_name else ""
    
    def get_short_name(self):
        """Короткое имя: Имя Фамилия"""
        short_name = []
        if self.first_name:
            short_name.append(self.first_name)
        if self.middle_name:
            short_name.append(self.last_name)
        return " ".join(short_name) if short_name else ""
    
    @property
    def full_name(self):
        """Свойство для удобного доступа к полному имени"""
        return self.get_full_name()
    
    @property
    def short_name(self):
        """Свойство для удобного доступа к короткому имени"""
        return self.get_short_name()