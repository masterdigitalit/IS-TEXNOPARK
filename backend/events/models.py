from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.validators import URLValidator, MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from django.utils import timezone


class Event(models.Model):
    """
    Модель для хранения информации о событиях/мероприятиях.
    """
    
    STATUS_CHOICES = [
        ('draft', _('Черновик')),
        ('published', _('Опубликовано')),
        ('cancelled', _('Отменено')),
        ('completed', _('Завершено')),
    ]
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='events',
        verbose_name=_('Организатор'),
    )
    
    name = models.CharField(
        max_length=255,
        verbose_name=_('Название события')
    )
    
    description = models.TextField(
        verbose_name=_('Описание'),
        blank=True,
        null=True
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name=_('Статус')
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Дата создания')
    )
    
    closes_at = models.DateTimeField(
        verbose_name=_('Дата окончания'),
        blank=True,
        null=True
    )
    
    image_url = models.URLField(
        max_length=500,
        verbose_name=_('URL изображения'),
        blank=True,
        null=True,
        validators=[URLValidator()]
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Дата обновления')
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Активно')
    )
    
    class Meta:
        verbose_name = _('Событие')
        verbose_name_plural = _('События')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['closes_at']),
            models.Index(fields=['owner', 'status']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"
    
    @property
    def is_open(self):
        """Проверяет, открыто ли еще событие для регистрации/участия"""
        if not self.closes_at:
            return True
        return timezone.now() < self.closes_at
    
    @property
    def has_online_sessions(self):
        """Есть ли у события онлайн-сессии"""
        return self.online_sessions.exists()
    
    @property
    def upcoming_online_sessions(self):
        """Будущие онлайн-сессии"""
        return self.online_sessions.filter(
            start_time__gt=timezone.now(),
            status='scheduled',
            is_active=True
        )
    
    @property
    def ongoing_online_sessions(self):
        """Текущие онлайн-сессии"""
        now = timezone.now()
        return self.online_sessions.filter(
            start_time__lte=now,
            end_time__gte=now,
            status='ongoing',
            is_active=True
        )
    
    def clean(self):
        """Валидация модели"""
        if self.closes_at and self.closes_at <= timezone.now():
            raise ValidationError({
                'closes_at': _('Дата закрытия должна быть в будущем')
            })
        super().clean()


class EventParticipant(models.Model):
    """
    Модель для участников событий.
    """
    ROLE_CHOICES = [
        ('participant', _('Участник')),
        ('speaker', _('Докладчик')),
        ('organizer', _('Организатор')),
        ('volunteer', _('Волонтер')),
    ]
    
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='event_participants'
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='event_participations'
    )
    
    registered_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Дата регистрации')
    )
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='participant',
        verbose_name=_('Роль')
    )
    
    is_confirmed = models.BooleanField(
        default=False,
        verbose_name=_('Подтверждено')
    )
    
    class Meta:
        verbose_name = _('Участник события')
        verbose_name_plural = _('Участники событий')
        unique_together = ['event', 'user']
        ordering = ['-registered_at']
        indexes = [
            models.Index(fields=['event', 'user']),
            models.Index(fields=['is_confirmed']),
        ]
    
    def __str__(self):
        # Безопасный метод __str__ для EventParticipant
        user_display = "Не указан"
        if self.user:
            # Проверяем различные возможные поля пользователя
            if hasattr(self.user, 'get_full_name') and self.user.get_full_name():
                user_display = self.user.get_full_name()
            elif hasattr(self.user, 'email'):
                user_display = self.user.email
            elif hasattr(self.user, 'username'):
                user_display = self.user.username
            else:
                user_display = str(self.user)
        
        event_display = self.event.name if self.event else "Не указано"
        return f"{user_display} - {event_display}"


class OnlineEventInfo(models.Model):
    """
    Модель для хранения информации об онлайн-сессиях/мероприятиях.
    """
    
    STATUS_CHOICES = [
        ('scheduled', _('Запланирована')),
        ('ongoing', _('В процессе')),
        ('completed', _('Завершена')),
        ('cancelled', _('Отменена')),
    ]
    
    PLATFORM_CHOICES = [
        ('zoom', 'Zoom'),
        ('teams', 'Microsoft Teams'),
        ('meet', 'Google Meet'),
        ('webex', 'Webex'),
        ('jitsi', 'Jitsi'),
        ('other', _('Другая')),
    ]
    
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='online_sessions',
        verbose_name=_('Событие'),
        help_text=_('Основное событие, к которому относится эта сессия')
    )
    
    session_name = models.CharField(
        max_length=255,
        verbose_name=_('Название сессии'),
        help_text=_('Название онлайн-сессии или мероприятия')
    )
    
    start_time = models.DateTimeField(
        verbose_name=_('Время начала'),
        help_text=_('Дата и время начала сессии')
    )
    
    end_time = models.DateTimeField(
        verbose_name=_('Время окончания'),
        help_text=_('Дата и время окончания сессии'),
        blank=True,
        null=True
    )
    
    session_notes = models.TextField(
        verbose_name=_('Заметки к сессии'),
        help_text=_('Дополнительная информация, инструкции, заметки'),
        blank=True,
        null=True
    )
    
    link = models.URLField(
        max_length=500,
        verbose_name=_('Ссылка'),
        help_text=_('Ссылка для подключения к онлайн-сессии'),
        blank=True,
        null=True,
        validators=[URLValidator()]
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Дата создания')
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Дата обновления')
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Активна')
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='scheduled',
        verbose_name=_('Статус сессии')
    )
    
    platform = models.CharField(
        max_length=20,
        choices=PLATFORM_CHOICES,
        default='other',
        verbose_name=_('Платформа'),
        blank=True
    )
    
    access_code = models.CharField(
        max_length=100,
        verbose_name=_('Код доступа'),
        blank=True,
        null=True,
        help_text=_('Пароль или код для входа в сессию')
    )
    
    max_participants = models.PositiveIntegerField(
        verbose_name=_('Максимум участников'),
        blank=True,
        null=True,
        help_text=_('Максимальное количество участников для этой сессии'),
        validators=[MinValueValidator(1)]
    )
    
    class Meta:
        verbose_name = _('Онлайн-сессия')
        verbose_name_plural = _('Онлайн-сессии')
        ordering = ['start_time', 'session_name']
        indexes = [
            models.Index(fields=['event', 'start_time']),
            models.Index(fields=['status']),
            models.Index(fields=['start_time']),
            models.Index(fields=['event', 'status']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_time__gt=models.F('start_time')) | models.Q(end_time__isnull=True),
                name='end_time_after_start_time'
            ),
        ]
    
    def __str__(self):
        return f"{self.session_name} ({self.event.name})"
    
    @property
    def duration_minutes(self):
        """Продолжительность сессии в минутах"""
        if self.start_time and self.end_time:
            duration = self.end_time - self.start_time
            return int(duration.total_seconds() / 60)
        return None
    
    @property
    def is_ongoing(self):
        """Проверяет, идет ли сессия сейчас"""
        if not self.start_time or self.status == 'cancelled' or not self.is_active:
            return False
        
        now = timezone.now()
        if self.start_time <= now:
            if self.end_time:
                return now <= self.end_time
            return True
        return False
    
    @property
    def is_upcoming(self):
        """Проверяет, запланирована ли сессия на будущее"""
        if not self.start_time or not self.is_active:
            return False
        return self.start_time > timezone.now() and self.status == 'scheduled'
    
    @property
    def is_past(self):
        """Проверяет, завершилась ли сессия"""
        if not self.start_time or not self.is_active:
            return False
        
        if self.end_time:
            return self.end_time < timezone.now()
        return self.start_time < (timezone.now() - timezone.timedelta(hours=1))
    
    def clean(self):
        """Валидация модели"""
        if self.end_time and self.start_time and self.end_time <= self.start_time:
            raise ValidationError({
                'end_time': _('Время окончания должно быть позже времени начала')
            })
        
        if self.start_time and self.start_time < timezone.now() and not self.pk:
            raise ValidationError({
                'start_time': _('Время начала не может быть в прошлом для новых сессий')
            })
        
        super().clean()
    
    def save(self, *args, **kwargs):
        """Переопределение save для автоматического обновления статуса"""
        if self.start_time and self.end_time:
            now = timezone.now()
            if now < self.start_time and self.status != 'cancelled':
                self.status = 'scheduled'
            elif self.start_time <= now <= self.end_time and self.status != 'cancelled':
                self.status = 'ongoing'
            elif now > self.end_time and self.status not in ['completed', 'cancelled']:
                self.status = 'completed'
        
        self.full_clean()
        super().save(*args, **kwargs)


class SessionAttendance(models.Model):
    """
    Модель для отслеживания посещаемости онлайн-сессий.
    """
    
    ATTENDANCE_STATUS = [
        ('registered', _('Зарегистрирован')),
        ('joined', _('Присоединился')),
        ('left', _('Вышел')),
        ('completed', _('Завершил')),
        ('no_show', _('Не явился')),
    ]
    
    session = models.ForeignKey(
        OnlineEventInfo,
        on_delete=models.CASCADE,
        related_name='attendances',
        verbose_name=_('Сессия')
    )
    
    participant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='session_attendances',
        verbose_name=_('Участник')
    )
    
    joined_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Время присоединения')
    )
    
    left_at = models.DateTimeField(
        verbose_name=_('Время выхода'),
        blank=True,
        null=True
    )
    
    status = models.CharField(
        max_length=20,
        choices=ATTENDANCE_STATUS,
        default='registered',
        verbose_name=_('Статус участия')
    )
    
    duration_seconds = models.PositiveIntegerField(
        verbose_name=_('Длительность присутствия (сек)'),
        default=0
    )
    
    rating = models.PositiveSmallIntegerField(
        verbose_name=_('Оценка'),
        blank=True,
        null=True,
        choices=[(i, str(i)) for i in range(1, 6)],
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    
    feedback = models.TextField(
        verbose_name=_('Отзыв'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Посещаемость сессии')
        verbose_name_plural = _('Посещаемость сессий')
        unique_together = ['session', 'participant']
        ordering = ['-joined_at']
        indexes = [
            models.Index(fields=['session', 'participant']),
            models.Index(fields=['status']),
            models.Index(fields=['joined_at']),
        ]
    
    def __str__(self):
        # Безопасный метод __str__ для SessionAttendance
        participant_display = "Не указан"
        if self.participant:
            # Проверяем различные возможные поля пользователя
            if hasattr(self.participant, 'email'):
                participant_display = self.participant.email
            elif hasattr(self.participant, 'get_full_name') and self.participant.get_full_name():
                participant_display = self.participant.get_full_name()
            elif hasattr(self.participant, 'username'):
                participant_display = self.participant.username
            else:
                participant_display = str(self.participant)
        
        session_display = self.session.session_name if self.session else "Не указана"
        return f"{participant_display} - {session_display}"
    
    @property
    def is_active(self):
        """Активна ли запись о посещении"""
        return self.status in ['joined', 'registered']
    
    def update_duration(self):
        """Обновляет длительность присутствия"""
        if self.joined_at and self.left_at:
            duration = self.left_at - self.joined_at
            self.duration_seconds = int(duration.total_seconds())
            self.save(update_fields=['duration_seconds'])


class SessionMaterial(models.Model):
    """
    Модель для хранения материалов онлайн-сессии.
    """
    
    MATERIAL_TYPES = [
        ('presentation', _('Презентация')),
        ('document', _('Документ')),
        ('video', _('Видео')),
        ('audio', _('Аудио')),
        ('link', _('Ссылка')),
        ('other', _('Другое')),
    ]
    
    session = models.ForeignKey(
        OnlineEventInfo,
        on_delete=models.CASCADE,
        related_name='materials',
        verbose_name=_('Сессия')
    )
    
    title = models.CharField(
        max_length=255,
        verbose_name=_('Название материала')
    )
    
    description = models.TextField(
        verbose_name=_('Описание'),
        blank=True,
        null=True
    )
    
    file = models.FileField(
        upload_to='session_materials/%Y/%m/%d/',
        verbose_name=_('Файл'),
        blank=True,
        null=True
    )
    
    file_url = models.URLField(
        max_length=500,
        verbose_name=_('Ссылка на файл'),
        blank=True,
        null=True,
        validators=[URLValidator()]
    )
    
    material_type = models.CharField(
        max_length=20,
        choices=MATERIAL_TYPES,
        default='document',
        verbose_name=_('Тип материала')
    )
    
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Дата загрузки')
    )
    
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('Загрузил'),
        related_name='uploaded_materials'
    )
    
    is_public = models.BooleanField(
        default=True,
        verbose_name=_('Публичный доступ')
    )
    
    class Meta:
        verbose_name = _('Материал сессии')
        verbose_name_plural = _('Материалы сессий')
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['session', 'material_type']),
            models.Index(fields=['uploaded_at']),
            models.Index(fields=['is_public']),
        ]
    
    def __str__(self):
        # Безопасный метод __str__ для SessionMaterial
        session_display = self.session.session_name if self.session else "Не указана"
        return f"{self.title} - {session_display}"
    
    @property
    def file_display(self):
        """Отображение файла или ссылки"""
        if self.file:
            return f"Файл: {self.file.name.split('/')[-1]}"
        elif self.file_url:
            return f"Ссылка: {self.file_url[:50]}..."
        return _("Нет файла")