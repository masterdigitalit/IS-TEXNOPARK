from django.contrib import admin
from .models import EventRating, EventStatistics, EventParticipantStatistics


@admin.register(EventRating)
class EventRatingAdmin(admin.ModelAdmin):
    list_display = ['event', 'online_session', 'offline_session', 'participant', 'referee', 'grading_system', 'score', 'created_at']
    list_filter = ['event', 'online_session', 'offline_session', 'referee', 'grading_system', 'score', 'created_at']
    search_fields = ['event__name', 'participant__user__email', 'referee__email']
    readonly_fields = ['created_at', 'updated_at']

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('event', 'online_session', 'offline_session', 'participant__user', 'referee')
        return queryset


@admin.register(EventStatistics)
class EventStatisticsAdmin(admin.ModelAdmin):
    list_display = [
        'event', 'average_score', 'total_participants_rated', 'total_ratings_given',
        'count_grade_5_total', 'count_grade_4_total', 'count_grade_3_total', 'count_grade_2_total', 'count_grade_1_total',
        'count_pass_total', 'count_fail_total', 'most_popular_grade_total', 'calculated_at'
    ]
    list_filter = ['calculated_at']
    search_fields = ['event__name']
    readonly_fields = ['calculated_at', 'grade_distribution_summary']
    fields = [
        'event', 'average_score', 'total_participants_rated', 'total_ratings_given',
        'count_grade_5_total', 'count_grade_4_total', 'count_grade_3_total', 'count_grade_2_total', 'count_grade_1_total',
        'count_pass_total', 'count_fail_total', 'most_popular_grade_total',
        'session_grade_distribution', 'session_averages', 'grade_distribution_summary', 'calculated_at'
    ]

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('event')
        return queryset

    def grade_distribution_summary(self, obj):
        """Отображает сводку распределения оценок"""
        if not obj:
            return "Нет данных"

        summary_parts = []

        # Пятибалльная система (по всему событию)
        if obj.count_grade_5_total > 0:
            summary_parts.append(f"5: {obj.count_grade_5_total}")
        if obj.count_grade_4_total > 0:
            summary_parts.append(f"4: {obj.count_grade_4_total}")
        if obj.count_grade_3_total > 0:
            summary_parts.append(f"3: {obj.count_grade_3_total}")
        if obj.count_grade_2_total > 0:
            summary_parts.append(f"2: {obj.count_grade_2_total}")
        if obj.count_grade_1_total > 0:
            summary_parts.append(f"1: {obj.count_grade_1_total}")

        # Система зачет/незачет (по всему событию)
        if obj.count_pass_total > 0:
            summary_parts.append(f"Зачет: {obj.count_pass_total}")
        if obj.count_fail_total > 0:
            summary_parts.append(f"Незачет: {obj.count_fail_total}")

        return ", ".join(summary_parts) if summary_parts else "Нет оценок"

    grade_distribution_summary.short_description = 'Распределение оценок по всему событию'


@admin.register(EventParticipantStatistics)
class EventParticipantStatisticsAdmin(admin.ModelAdmin):
    list_display = [
        'event', 'participant', 'final_score', 'average_score', 'calculated_at'
    ]
    list_filter = ['event', 'calculated_at']
    search_fields = ['event__name', 'participant__user__email', 'participant__user__first_name', 'participant__user__last_name']
    readonly_fields = ['calculated_at', 'session_scores_count_display']
    fields = [
        'event', 'participant', 'session_scores_count_display', 'final_score', 'average_score', 'most_popular_grades', 'calculated_at'
    ]

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('event', 'participant__user')
        return queryset

    def session_scores_count_display(self, obj):
        """Отображает распределение оценок по сессиям"""
        if not obj.session_scores_count:
            return "Нет данных"

        # Преобразуем ID сессий в понятные названия
        result_parts = []
        for session_key, count in obj.session_scores_count.items():
            if session_key.startswith('online_'):
                session_id = session_key.replace('online_', '')
                result_parts.append(f"Онлайн сессия {session_id}: {count} оценок")
            elif session_key.startswith('offline_'):
                session_id = session_key.replace('offline_', '')
                result_parts.append(f"Оффлайн сессия {session_id}: {count} оценок")
            elif session_key == 'event':
                result_parts.append(f"За событие: {count} оценок")

        return ", ".join(result_parts) if result_parts else "Нет данных"

    session_scores_count_display.short_description = 'Количество оценок по сессиям'