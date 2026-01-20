from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from events.models import Event, OnlineEventInfo


class ProjectWork(models.Model):
    """
    Работа участника на мероприятии.
    """
    
    STATUS_CHOICES = [
        ('draft', _('Черновик')),
        ('submitted', _('Отправлено')),
        ('under_review', _('На проверке')),
        ('evaluated', _('Оценено')),
        ('rejected', _('Отклонено')),
    ]
    
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='project_works',
        verbose_name=_('Мероприятие'),
        help_text=_('Мероприятие, на которое загружена работа')
    )
    
    participant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='submitted_works',
        verbose_name=_('Участник'),
        help_text=_('Пользователь, загрузивший работу')
    )
    
    title = models.CharField(
        max_length=255,
        verbose_name=_('Название работы')
    )
    
    description = models.TextField(
        verbose_name=_('Описание'),
        blank=True,
        null=True
    )
    
    file_url = models.URLField(
        max_length=500,
        verbose_name=_('Ссылка на файл'),
        blank=True,
        null=True,
        help_text=_('Ссылка на работу (Google Drive, Dropbox и т.д.)')
    )
    
    file = models.FileField(
        upload_to='project_works/%Y/%m/%d/',
        verbose_name=_('Файл работы'),
        blank=True,
        null=True,
        help_text=_('Загруженный файл работы')
    )
    
    submitted_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Дата отправки')
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Дата обновления')
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='submitted',
        verbose_name=_('Статус работы')
    )
    
    category = models.CharField(
        max_length=100,
        verbose_name=_('Категория'),
        blank=True,
        null=True,
        help_text=_('Категория работы (опционально)')
    )
    
    is_published = models.BooleanField(
        default=True,
        verbose_name=_('Опубликовано'),
        help_text=_('Видна ли работа судьям и другим участникам')
    )
    
    class Meta:
        verbose_name = _('Работа участника')
        verbose_name_plural = _('Работы участников')
        ordering = ['-submitted_at']
        unique_together = ['event', 'participant']
        indexes = [
            models.Index(fields=['event', 'participant']),
            models.Index(fields=['status']),
            models.Index(fields=['submitted_at']),
            models.Index(fields=['is_published']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.participant.email})"
    
    @property
    def has_file(self):
        """Есть ли файл у работы"""
        return bool(self.file) or bool(self.file_url)


class EvaluationCriteria(models.Model):
    """
    Критерии оценивания для мероприятия.
    """
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='evaluation_criteria',
        verbose_name=_('Мероприятие'),
        help_text=_('Мероприятие, для которого настроены критерии')
    )
    
    name = models.CharField(
        max_length=255,
        verbose_name=_('Название критерия')
    )
    
    description = models.TextField(
        verbose_name=_('Описание критерия'),
        blank=True,
        null=True,
        help_text=_('Пояснение, что оценивается по этому критерию')
    )
    
    max_score = models.PositiveIntegerField(
        default=10,
        verbose_name=_('Максимальный балл'),
        help_text=_('Максимально возможная оценка по этому критерию'),
        validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    
    weight = models.FloatField(
        default=1.0,
        verbose_name=_('Вес критерия'),
        help_text=_('Вес критерия в итоговой оценке (по умолчанию 1.0)'),
        validators=[MinValueValidator(0.1), MaxValueValidator(5.0)]
    )
    
    order = models.PositiveIntegerField(
        default=0,
        verbose_name=_('Порядок'),
        help_text=_('Порядок отображения критериев (меньше = выше)')
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Активен'),
        help_text=_('Используется ли этот критерий при оценке')
    )
    
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name=_('Создан')
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Обновлен')
    )
    
    class Meta:
        verbose_name = _('Критерий оценивания')
        verbose_name_plural = _('Критерии оценивания')
        ordering = ['order', 'name']
        unique_together = ['event', 'name']
        indexes = [
            models.Index(fields=['event', 'is_active']),
            models.Index(fields=['order']),
        ]
    
    def __str__(self):
        return f"{self.name} (макс. {self.max_score})"


class Evaluation(models.Model):
    """
    Оценка работы судьей.
    """
    project = models.ForeignKey(
        ProjectWork,
        on_delete=models.CASCADE,
        related_name='evaluations',
        verbose_name=_('Работа'),
        help_text=_('Работа, которую оценивают')
    )
    
    judge = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='given_evaluations',
        verbose_name=_('Судья'),
        help_text=_('Пользователь, который выставляет оценку'),
        # ⭐ ИСПРАВЛЕНО: убрал limit_choices_to, сделаем через админку
    )
    
    criteria = models.ForeignKey(
        EvaluationCriteria,
        on_delete=models.CASCADE,
        related_name='evaluations',
        verbose_name=_('Критерий'),
        help_text=_('Критерий, по которому выставляется оценка')
    )
    
    score = models.FloatField(
        verbose_name=_('Балл'),
        help_text=_('Оценка по данному критерию'),
        validators=[MinValueValidator(0)]
    )
    
    comment = models.TextField(
        verbose_name=_('Комментарий'),
        blank=True,
        null=True,
        help_text=_('Обратная связь от судьи')
    )
    
    evaluated_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Дата оценки')
    )
    
    is_confirmed = models.BooleanField(
        default=False,
        verbose_name=_('Подтверждено'),
        help_text=_('Оценка подтверждена и финальна')
    )
    
    confirmed_at = models.DateTimeField(
        verbose_name=_('Дата подтверждения'),
        blank=True,
        null=True,
        help_text=_('Когда оценка была подтверждена')
    )
    
    session = models.ForeignKey(
        OnlineEventInfo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='session_evaluations',
        verbose_name=_('Сессия'),
        help_text=_('Сессия, во время которой была выставлена оценка')
    )
    
    class Meta:
        verbose_name = _('Оценка')
        verbose_name_plural = _('Оценки')
        unique_together = ['project', 'judge', 'criteria']
        ordering = ['-evaluated_at']
        indexes = [
            models.Index(fields=['project', 'judge']),
            models.Index(fields=['is_confirmed']),
            models.Index(fields=['evaluated_at']),
        ]
    
    def __str__(self):
        return f"{self.judge.email} → {self.project.title}: {self.score}"
    
    def save(self, *args, **kwargs):
        """Автоматически подтверждаем оценку при сохранении."""
        if not self.pk and not self.is_confirmed:
            self.is_confirmed = True
            self.confirmed_at = timezone.now()
        super().save(*args, **kwargs)


class CachedStatistic(models.Model):
    """
    Кэшированные результаты расчетов статистики.
    """
    STATISTIC_TYPES = [
        ('event_summary', _('Сводка по мероприятию')),
        ('rating_summary', _('Сводка по оценкам')),
        ('judge_consensus', _('Согласованность судей')),
        ('participant_stats', _('Статистика участников')),
        ('leaderboard', _('Текущий рейтинг')),
        ('weighted_avg', _('Взвешенное среднее')),
    ]
    
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='cached_statistics',
        verbose_name=_('Мероприятие')
    )
    
    statistic_type = models.CharField(
        max_length=50,
        choices=STATISTIC_TYPES,
        verbose_name=_('Тип статистики')
    )
    
    data = models.JSONField(
        verbose_name=_('Данные статистики'),
        help_text=_('Рассчитанные результаты в формате JSON')
    )
    
    calculated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Рассчитано')
    )
    
    expires_at = models.DateTimeField(
        verbose_name=_('Истекает'),
        help_text=_('Время, после которого данные считаются устаревшими')
    )
    
    version = models.PositiveIntegerField(
        default=1,
        verbose_name=_('Версия')
    )
    
    class Meta:
        verbose_name = _('Кэшированная статистика')
        verbose_name_plural = _('Кэшированная статистика')
        unique_together = ['event', 'statistic_type']
        ordering = ['-calculated_at']
        indexes = [
            models.Index(fields=['event', 'statistic_type']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['calculated_at']),
        ]
    
    def __str__(self):
        return f"{self.get_statistic_type_display()} - {self.event.name}"
    
    def is_expired(self):
        """Проверяет, устарели ли данные."""
        return timezone.now() > self.expires_at


class JudgeWeight(models.Model):
    """
    Вес оценки судьи для расчета взвешенного среднего.
    """
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='judge_weights',
        verbose_name=_('Мероприятие')
    )
    
    judge = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='judge_weights',
        verbose_name=_('Судья'),
        # ⭐ ИСПРАВЛЕНО: убрал limit_choices_to, сделаем через админку
    )
    
    weight = models.FloatField(
        default=1.0,
        verbose_name=_('Вес судьи'),
        help_text=_('Вес оценки этого судьи при расчете взвешенного среднего'),
        validators=[MinValueValidator(0.1), MaxValueValidator(3.0)]
    )
    
    calculated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Рассчитано')
    )
    
    calculation_method = models.CharField(
        max_length=50,
        choices=[
            ('manual', _('Вручную')),
            ('consensus', _('По согласованности')),
            ('reputation', _('По репутации')),
        ],
        default='consensus',
        verbose_name=_('Метод расчета')
    )
    
    class Meta:
        verbose_name = _('Вес судьи')
        verbose_name_plural = _('Веса судей')
        unique_together = ['event', 'judge']
        indexes = [
            models.Index(fields=['event', 'judge']),
            models.Index(fields=['weight']),
        ]
    
    def __str__(self):
        return f"{self.judge.email} - вес: {self.weight}"


class StatisticSnapshot(models.Model):
    """
    Снимки статистики в определенные моменты времени.
    """
    SNAPSHOT_TYPES = [
        ('daily', _('Ежедневный')),
        ('weekly', _('Еженедельный')),
        ('milestone', _('По вехам')),
        ('manual', _('Вручную')),
    ]
    
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='statistic_snapshots',
        verbose_name=_('Мероприятие')
    )
    
    snapshot_type = models.CharField(
        max_length=50,
        choices=SNAPSHOT_TYPES,
        verbose_name=_('Тип снимка')
    )
    
    data = models.JSONField(
        verbose_name=_('Данные снимка')
    )
    
    taken_at = models.DateTimeField(
        verbose_name=_('Время снимка')
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Создано')
    )
    
    notes = models.TextField(
        verbose_name=_('Примечания'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Снимок статистики')
        verbose_name_plural = _('Снимки статистики')
        ordering = ['-taken_at']
        indexes = [
            models.Index(fields=['event', 'snapshot_type']),
            models.Index(fields=['taken_at']),
        ]
    
    def __str__(self):
        return f"{self.event.name} - {self.get_snapshot_type_display()} - {self.taken_at.date()}"