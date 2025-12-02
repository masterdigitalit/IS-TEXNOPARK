from django.db import models

class User(models.Model):
    middle_name = models.CharField(
        _('отчество'),
        max_length=150,
        blank=True,
        null=True
    )
    

    created_at = models.DateTimeField(
        _('дата создания'),
        auto_now_add=True  # Автоматически устанавливается при создании
    )
    
    # Last_login_at (уже есть в AbstractUser как last_login)
    # Для совместимости с вашей схемой переименуем или оставим как есть
    
    # Роль (Role) - используем группы Django или кастомное поле
    ROLE_CHOICES = [
        ('admin', 'Админ'),
        ('student', 'Студент'),
        ('teacher', 'Учитель'),
        ('referee', 'Судья'),
    ]
    
    role = models.CharField(
        _('роль'),
        max_length=20,
        choices=ROLE_CHOICES,
        default='user'
    )
    
    # Почта (email уже есть в AbstractUser)
    # Phone - телефон
    phone = models.CharField(
        _('телефон'),
        max_length=20,
        blank=True,
        null=True,
        unique=True
    )
    
    # Avatar_url - URL аватара
    avatar_url = models.URLField(
        _('URL аватара'),
        max_length=500,
        blank=True,
        null=True
    )
    
    # Дополнительные поля для улучшения безопасности
    is_verified = models.BooleanField(
        _('подтвержден'),
        default=False
    )
    
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
        ]
    
    def __str__(self):
        # Красивое отображение в админке
        if self.first_name and self.last_name:
            return f"{self.last_name} {self.first_name}"
        return self.username or self.email
    
    def get_full_name(self):
        # Переопределяем метод для отображения ФИО
        full_name = []
        if self.last_name:
            full_name.append(self.last_name)
        if self.first_name:
            full_name.append(self.first_name)
        if self.middle_name:
            full_name.append(self.middle_name)
        return " ".join(full_name) if full_name else self.username
    
    @property
    def full_name(self):
        return self.get_full_name()
