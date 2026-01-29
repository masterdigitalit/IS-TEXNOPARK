import math
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from events.models import Event, EventParticipant, OnlineEventInfo, OfflineSessionsInfo


class EventRating(models.Model):
    """
    Модель для хранения оценок судей для участников события или сессии.
    """
    # Choices for grading system
    GRADING_SYSTEM_CHOICES = [
        ('five_point', _('Пятибалльная система')),
        ('pass_fail', _('Зачет/незачет')),
    ]

    # Choices for pass/fail grades
    PASS_FAIL_CHOICES = [
        (1, _('Зачет')),
        (0, _('Незачет')),
    ]

    # Поле для связи с событием (обязательное)
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='ratings',
        verbose_name=_('Событие')
    )

    # Поле для связи с сессией (необязательное)
    online_session = models.ForeignKey(
        OnlineEventInfo,
        on_delete=models.CASCADE,
        related_name='ratings',
        verbose_name=_('Онлайн-сессия'),
        null=True,
        blank=True
    )

    offline_session = models.ForeignKey(
        OfflineSessionsInfo,
        on_delete=models.CASCADE,
        related_name='ratings',
        verbose_name=_('Оффлайн-сессия'),
        null=True,
        blank=True
    )

    participant = models.ForeignKey(
        EventParticipant,
        on_delete=models.CASCADE,
        related_name='ratings',
        verbose_name=_('Участник')
    )

    referee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='given_ratings',
        verbose_name=_('Судья')
    )

    grading_system = models.CharField(
        max_length=20,
        choices=GRADING_SYSTEM_CHOICES,
        default='five_point',
        verbose_name=_('Система оценивания')
    )

    score = models.PositiveSmallIntegerField(
        verbose_name=_('Оценка'),
        choices=[(i, str(i)) for i in range(6)] + PASS_FAIL_CHOICES,  # 0-5 for five-point, 0/1 for pass/fail
        help_text=_('Оценка: 1-5 для пятибалльной системы, 0-незачет/1-зачет для зачетной системы')
    )

    # Поле для комментариев к оценке
    comment = models.TextField(
        verbose_name=_('Комментарий к оценке'),
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Дата создания')
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Дата обновления')
    )

    class Meta:
        verbose_name = _('Оценка события')
        verbose_name_plural = _('Оценки событий')
        # Ограничения уникальности будут проверяться в методе clean()
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event', 'participant', 'referee']),
            models.Index(fields=['referee']),
            models.Index(fields=['score']),
            models.Index(fields=['created_at']),
            models.Index(fields=['online_session']),
            models.Index(fields=['offline_session']),
            models.Index(fields=['online_session', 'participant', 'referee']),
            models.Index(fields=['offline_session', 'participant', 'referee']),
        ]

    def __str__(self):
        return f"{self.referee} оценил {self.participant} на {self.score}/5 для события {self.event}"

    def save(self, *args, **kwargs):
        """Переопределяем метод save для автоматического пересчета статистики"""
        is_new = self.pk is None  # Проверяем, новая ли это оценка
        super().save(*args, **kwargs)

        # После сохранения оценки пересчитываем статистику участника
        from .models import EventParticipantStatistics
        EventParticipantStatistics.calculate_for_participant(self.event, self.participant)

        # Также пересчитываем общую статистику события
        from .models import EventStatistics
        EventStatistics.calculate_for_event(self.event)

    def clean(self):
        """Валидация модели"""
        # Проверяем, что судья действительно является судьей в этом событии
        if self.referee and self.event:
            try:
                referee_participation = EventParticipant.objects.get(
                    event=self.event,
                    user=self.referee,
                    role='referee'
                )
            except EventParticipant.DoesNotExist:
                raise ValidationError({
                    'referee': _('Пользователь не является судьей в этом событии')
                })

        # Проверяем, что оценка связана либо с событием целиком, либо с одной из сессий
        if self.online_session and self.offline_session:
            raise ValidationError({
                'online_session': _('Оценка не может быть одновременно связана с онлайн и оффлайн сессией'),
                'offline_session': _('Оценка не может быть одновременно связана с онлайн и оффлайн сессией')
            })

        # Проверяем, что если указана сессия, она принадлежит событию
        if self.online_session and self.online_session.event != self.event:
            raise ValidationError({
                'online_session': _('Онлайн-сессия должна принадлежать указанному событию')
            })

        if self.offline_session and self.offline_session.event != self.event:
            raise ValidationError({
                'offline_session': _('Оффлайн-сессия должна принадлежать указанному событию')
            })

        # Проверяем уникальность оценки
        # Если указана сессия (онлайн или оффлайн), то проверяем уникальность в рамках сессии
        # Если сессия не указана, то проверяем уникальность в рамках события
        existing_rating = None

        if self.online_session:
            # Проверяем уникальность в рамках онлайн-сессии
            existing_rating = EventRating.objects.filter(
                online_session=self.online_session,
                participant=self.participant,
                referee=self.referee
            ).exclude(pk=self.pk if self.pk else None).first()
        elif self.offline_session:
            # Проверяем уникальность в рамках оффлайн-сессии
            existing_rating = EventRating.objects.filter(
                offline_session=self.offline_session,
                participant=self.participant,
                referee=self.referee
            ).exclude(pk=self.pk if self.pk else None).first()
        else:
            # Проверяем уникальность в рамках события (если сессия не указана)
            existing_rating = EventRating.objects.filter(
                event=self.event,
                participant=self.participant,
                referee=self.referee
            ).exclude(pk=self.pk if self.pk else None).first()

        if existing_rating:
            if self.online_session:
                raise ValidationError({
                    'online_session': _('Судья уже оценил этого участника за эту онлайн-сессию')
                })
            elif self.offline_session:
                raise ValidationError({
                    'offline_session': _('Судья уже оценил этого участника за эту оффлайн-сессию')
                })
            else:
                raise ValidationError({
                    'event': _('Судья уже оценил этого участника за это событие')
                })

        # Валидация оценки в зависимости от системы оценивания
        if self.grading_system == 'five_point':
            if self.score not in [1, 2, 3, 4, 5]:
                raise ValidationError({
                    'score': _('Для пятибалльной системы допустимы оценки от 1 до 5')
                })
        elif self.grading_system == 'pass_fail':
            if self.score not in [0, 1]:
                raise ValidationError({
                    'score': _('Для системы зачет/незачет допустимы значения 0 (незачет) и 1 (зачет)')
                })


class EventParticipantStatistics(models.Model):
    """
    Модель для хранения статистики по участнику события.
    """
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='participant_statistics',
        verbose_name=_('Событие')
    )

    participant = models.ForeignKey(
        EventParticipant,
        on_delete=models.CASCADE,
        related_name='statistics',
        verbose_name=_('Участник')
    )

    # Статистика по оценкам за сессии
    session_scores_count = models.JSONField(
        verbose_name=_('Количество оценок по сессиям'),
        default=dict,
        help_text=_('Словарь с ID сессии как ключом и количеством оценок как значением')
    )

    # Итоговая оценка участника (среднее арифметическое по всем сессиям, округленное в большую сторону)
    final_score = models.FloatField(
        verbose_name=_('Итоговая оценка участника'),
        null=True,
        blank=True,
        help_text=_('Среднее арифметическое по всем сессиям, округленное в большую сторону')
    )

    # Средний балл по всем сессиям участника
    average_score = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        verbose_name=_('Средний балл участника по всем сессиям'),
        null=True,
        blank=True
    )

    # Самые популярные оценки участника
    most_popular_grades = models.CharField(
        max_length=100,
        verbose_name=_('Самые популярные оценки участника'),
        null=True,
        blank=True,
        help_text=_('Перечень самых популярных оценок участника, разделенных запятой')
    )

    calculated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Дата расчета статистики')
    )

    class Meta:
        verbose_name = _('Статистика участника события')
        verbose_name_plural = _('Статистики участников событий')
        unique_together = ['event', 'participant']
        ordering = ['-calculated_at']

    def __str__(self):
        return f"Статистика для {self.participant.user.get_full_name() if self.participant.user.get_full_name() else self.participant.user.email} в событии {self.event.name}"

    @classmethod
    def calculate_for_participant(cls, event, participant):
        """
        Метод для расчета статистики для конкретного участника в событии.
        """
        # Получаем все оценки участника для этого события
        ratings = EventRating.objects.filter(
            event=event,
            participant=participant
        )

        if not ratings.exists():
            # Если нет оценок, создаем/обновляем статистику с нулевыми значениями
            stats, created = cls.objects.get_or_create(event=event, participant=participant)
            stats.final_score = None
            stats.average_score = None
            stats.session_scores_count = {}
            stats.save()
            return stats

        # Подсчитываем только пятибалльные оценки для вычисления среднего
        five_point_scores = []
        session_scores = {}

        for rating in ratings:
            # Определяем ID сессии (онлайн или оффлайн)
            session_id = None
            if rating.online_session:
                session_id = f"online_{rating.online_session.id}"
            elif rating.offline_session:
                session_id = f"offline_{rating.offline_session.id}"
            else:
                session_id = "event"  # Оценка за событие в целом

            # Подсчитываем оценки по сессиям
            if session_id not in session_scores:
                session_scores[session_id] = []

            # Добавляем только пятибалльные оценки в общий список для вычисления среднего
            if rating.grading_system == 'five_point':
                five_point_scores.append(rating.score)

            session_scores[session_id].append(rating.score)

        # Вычисляем средний балл по всем пятибалльным оценкам
        if five_point_scores:
            avg_score = sum(five_point_scores) / len(five_point_scores)
            # Округляем в большую сторону до целого числа
            final_score = math.ceil(avg_score)
        else:
            avg_score = None
            final_score = None

        # Подсчитываем распределение оценок участника для определения самых популярных
        all_participant_scores = []
        for rating in ratings:
            if rating.grading_system == 'five_point':
                all_participant_scores.append(rating.score)

        # Подсчитываем количество каждой оценки
        score_counts = {}
        for score in all_participant_scores:
            if score in score_counts:
                score_counts[score] += 1
            else:
                score_counts[score] = 1

        # Находим все самые популярные оценки
        if score_counts:
            max_count = max(score_counts.values())
            most_popular_grades_list = [grade for grade, count in score_counts.items() if count == max_count]
            most_popular_grades_str = ', '.join(map(str, sorted(most_popular_grades_list)))
        else:
            most_popular_grades_str = None

        # Создаем или обновляем статистику
        stats, created = cls.objects.get_or_create(event=event, participant=participant)
        stats.session_scores_count = {k: len(v) for k, v in session_scores.items()}
        stats.average_score = avg_score
        stats.final_score = final_score
        stats.most_popular_grades = most_popular_grades_str
        stats.save()

        return stats


class EventStatistics(models.Model):
    """
    Модель для хранения статистики по событию (средние оценки и т.д.).
    """
    event = models.OneToOneField(
        Event,
        on_delete=models.CASCADE,
        related_name='statistics',
        verbose_name=_('Событие')
    )

    # Статистика по событию в целом
    average_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        verbose_name=_('Средний балл по всему событию'),
        null=True,
        blank=True,
        help_text=_('Средний арифметический балл всех участников по всему событию')
    )

    total_participants_rated = models.PositiveIntegerField(
        verbose_name=_('Всего участников с оценками'),
        default=0
    )

    total_ratings_given = models.PositiveIntegerField(
        verbose_name=_('Всего оценок выставлено'),
        default=0
    )

    # Статистика по событию в целом - распределение оценок
    count_grade_5_total = models.PositiveIntegerField(
        verbose_name=_('Количество оценок 5 по всему событию'),
        default=0
    )

    count_grade_4_total = models.PositiveIntegerField(
        verbose_name=_('Количество оценок 4 по всему событию'),
        default=0
    )

    count_grade_3_total = models.PositiveIntegerField(
        verbose_name=_('Количество оценок 3 по всему событию'),
        default=0
    )

    count_grade_2_total = models.PositiveIntegerField(
        verbose_name=_('Количество оценок 2 по всему событию'),
        default=0
    )

    count_grade_1_total = models.PositiveIntegerField(
        verbose_name=_('Количество оценок 1 по всему событию'),
        default=0
    )

    count_pass_total = models.PositiveIntegerField(
        verbose_name=_('Количество зачетов по всему событию'),
        default=0
    )

    count_fail_total = models.PositiveIntegerField(
        verbose_name=_('Количество незачетов по всему событию'),
        default=0
    )

    most_popular_grade_total = models.CharField(
        max_length=100,
        verbose_name=_('Самые популярные оценки по всему событию'),
        null=True,
        blank=True,
        help_text=_('Перечень самых популярных оценок по всему событию, разделенных запятой')
    )

    # Статистика по сессиям - распределение оценок
    session_grade_distribution = models.JSONField(
        verbose_name=_('Распределение оценок по сессиям'),
        default=dict,
        help_text=_('Словарь с ID сессии как ключом и статистикой оценок как значением')
    )

    # Средние баллы по сессиям
    session_averages = models.JSONField(
        verbose_name=_('Средние баллы по сессиям'),
        default=dict,
        help_text=_('Словарь с ID сессии как ключом и средним баллом как значением')
    )

    calculated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Дата расчета статистики')
    )

    class Meta:
        verbose_name = _('Статистика события')
        verbose_name_plural = _('Статистики событий')
        ordering = ['-calculated_at']

    def __str__(self):
        avg_score_str = f"{float(self.average_score):.2f}" if self.average_score else "N/A"
        return f"Статистика для {self.event}: средний балл {avg_score_str}"

    @classmethod
    def calculate_for_event(cls, event):
        """
        Метод для расчета статистики для конкретного события.
        """
        # Получаем все оценки для события (включая оценки сессий)
        ratings = EventRating.objects.filter(event=event)

        if not ratings.exists():
            # Если нет оценок, создаем/обновляем статистику с нулевыми значениями
            stats, created = cls.objects.get_or_create(event=event)
            stats.average_score = None
            stats.total_participants_rated = 0
            stats.total_ratings_given = 0
            # Обнуляем счетчики оценок
            stats.count_grade_5_total = 0
            stats.count_grade_4_total = 0
            stats.count_grade_3_total = 0
            stats.count_grade_2_total = 0
            stats.count_grade_1_total = 0
            stats.count_pass_total = 0
            stats.count_fail_total = 0
            stats.most_popular_grade_total = None
            stats.session_grade_distribution = {}
            stats.session_averages = {}
            stats.save()
            return stats

        # Вычисляем статистику
        total_ratings = ratings.count()

        # Пересчитываем статистику участников, чтобы получить актуальные итоговые оценки
        participants = EventParticipant.objects.filter(event=event)
        for participant in participants:
            EventParticipantStatistics.calculate_for_participant(event, participant)

        # Теперь получаем всех участников, которые имеют итоговую оценку
        participant_stats = EventParticipantStatistics.objects.filter(event=event).exclude(final_score__isnull=True)

        # Собираем итоговые оценки участников для вычисления общей статистики
        final_scores = [stat.final_score for stat in participant_stats if stat.final_score is not None]

        # Подсчитываем распределение оценок по сессиям
        session_grade_distribution = {}
        session_averages = {}

        for rating in ratings:
            # Подсчитываем распределение по сессиям
            session_id = None
            if rating.online_session:
                session_id = f"online_{rating.online_session.id}"
            elif rating.offline_session:
                session_id = f"offline_{rating.offline_session.id}"
            else:
                session_id = "event"  # Оценка за событие в целом

            if session_id not in session_grade_distribution:
                session_grade_distribution[session_id] = {'five_point': {}, 'pass_fail': {}}

            if rating.grading_system == 'five_point':
                if rating.score in session_grade_distribution[session_id]['five_point']:
                    session_grade_distribution[session_id]['five_point'][rating.score] += 1
                else:
                    session_grade_distribution[session_id]['five_point'][rating.score] = 1
            elif rating.grading_system == 'pass_fail':
                if rating.score in session_grade_distribution[session_id]['pass_fail']:
                    session_grade_distribution[session_id]['pass_fail'][rating.score] += 1
                else:
                    session_grade_distribution[session_id]['pass_fail'][rating.score] = 1

        # Вычисляем средние баллы по сессиям
        for session_id, dist in session_grade_distribution.items():
            # Считаем только пятибалльные оценки для среднего
            five_point_scores = []
            for score, count in dist['five_point'].items():
                five_point_scores.extend([score] * count)

            if five_point_scores:
                session_avg = sum(five_point_scores) / len(five_point_scores)
                session_averages[session_id] = round(session_avg, 2)

        if final_scores:
            # Вычисляем среднюю оценку по итоговым оценкам участников
            average_score = sum(final_scores) / len(final_scores)

            # Подсчитываем распределение итоговых оценок участников
            grade_counts_total = {}
            for score in final_scores:
                # Округляем оценки в большую сторону до целого числа для подсчета
                import math
                rounded_score = math.ceil(score)
                if rounded_score in grade_counts_total:
                    grade_counts_total[rounded_score] += 1
                else:
                    grade_counts_total[rounded_score] = 1
        else:
            average_score = None
            grade_counts_total = {}

        # Создаем или обновляем статистику
        stats, created = cls.objects.get_or_create(event=event)
        stats.average_score = average_score
        stats.total_participants_rated = participant_stats.count()  # Обновляем на основе участников с итоговыми оценками
        stats.total_ratings_given = total_ratings

        # Устанавливаем счетчики оценок для пятибалльной системы по всему событию (на основе итоговых оценок участников)
        stats.count_grade_5_total = grade_counts_total.get(5, 0)
        stats.count_grade_4_total = grade_counts_total.get(4, 0)
        stats.count_grade_3_total = grade_counts_total.get(3, 0)
        stats.count_grade_2_total = grade_counts_total.get(2, 0)
        stats.count_grade_1_total = grade_counts_total.get(1, 0)

        # Для зачет/незачет используем исходные оценки
        # Подсчитываем оригинальные зачет/незачет оценки
        original_pass_fail_counts = {'pass': 0, 'fail': 0}
        for rating in ratings.filter(grading_system='pass_fail'):
            if rating.score == 1:
                original_pass_fail_counts['pass'] += 1
            elif rating.score == 0:
                original_pass_fail_counts['fail'] += 1

        stats.count_pass_total = original_pass_fail_counts['pass']
        stats.count_fail_total = original_pass_fail_counts['fail']

        # Находим все самые популярные оценки среди итоговых оценок участников
        if grade_counts_total:
            max_count = max(grade_counts_total.values())
            most_popular_grades = [grade for grade, count in grade_counts_total.items() if count == max_count]
            # Сохраняем как строку с перечислением всех самых популярных оценок
            stats.most_popular_grade_total = ', '.join(map(str, sorted(most_popular_grades)))
        else:
            stats.most_popular_grade_total = None

        # Сохраняем распределение оценок по сессиям
        stats.session_grade_distribution = session_grade_distribution
        stats.session_averages = session_averages

        stats.save()

        return stats

    @classmethod
    def calculate_for_session(cls, session):
        """
        Метод для расчета статистики для конкретной сессии.
        """
        # Получаем все оценки для сессии
        if hasattr(session, 'ratings'):  # Это онлайн-сессия
            ratings = session.ratings.all()
        else:  # Это оффлайн-сессия
            ratings = session.ratings.all()

        if not ratings.exists():
            # Возвращаем пустую статистику для сессии
            return {
                'average_score': None,
                'total_participants_rated': 0,
                'total_ratings_given': 0,
                'count_grade_5': 0,
                'count_grade_4': 0,
                'count_grade_3': 0,
                'count_grade_2': 0,
                'count_grade_1': 0,
                'count_pass': 0,
                'count_fail': 0,
                'most_popular_grade': None
            }

        # Вычисляем статистику
        total_ratings = ratings.count()
        total_participants_rated = ratings.values('participant').distinct().count()

        # Вычисляем среднюю оценку только для пятибалльной системы
        five_point_ratings = ratings.filter(grading_system='five_point')
        if five_point_ratings.exists():
            average_score = five_point_ratings.aggregate(avg=models.Avg('score'))['avg']
        else:
            average_score = None

        # Подсчитываем распределение оценок
        grade_counts = {'five_point': {}, 'pass_fail': {}}

        for rating in ratings:
            score = rating.score
            if rating.grading_system == 'five_point':
                if score in grade_counts['five_point']:
                    grade_counts['five_point'][score] += 1
                else:
                    grade_counts['five_point'][score] = 1
            elif rating.grading_system == 'pass_fail':
                if score in grade_counts['pass_fail']:
                    grade_counts['pass_fail'][score] += 1
                else:
                    grade_counts['pass_fail'][score] = 1

        # Формируем результат
        session_stats = {
            'average_score': average_score,
            'total_participants_rated': total_participants_rated,
            'total_ratings_given': total_ratings,
            'count_grade_5': grade_counts['five_point'].get(5, 0),
            'count_grade_4': grade_counts['five_point'].get(4, 0),
            'count_grade_3': grade_counts['five_point'].get(3, 0),
            'count_grade_2': grade_counts['five_point'].get(2, 0),
            'count_grade_1': grade_counts['five_point'].get(1, 0),
            'count_pass': grade_counts['pass_fail'].get(1, 0),
            'count_fail': grade_counts['pass_fail'].get(0, 0),
        }

        # Находим все самые популярные оценки среди всех оценок
        all_grade_counts = {}
        all_grade_counts.update(grade_counts['five_point'])
        all_grade_counts.update(grade_counts['pass_fail'])

        if all_grade_counts:
            max_count = max(all_grade_counts.values())
            most_popular_grades = [grade for grade, count in all_grade_counts.items() if count == max_count]
            # Возвращаем как строку с перечислением всех самых популярных оценок
            session_stats['most_popular_grade'] = ', '.join(map(str, sorted(most_popular_grades)))
        else:
            session_stats['most_popular_grade'] = None

        return session_stats