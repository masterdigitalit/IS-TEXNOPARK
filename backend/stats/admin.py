from django.contrib import admin
from django.utils import timezone
from django import forms
from django.contrib.auth import get_user_model
from events.models import Event, EventParticipant, OnlineEventInfo
from .models import (
    ProjectWork, EvaluationCriteria, Evaluation,
    CachedStatistic, JudgeWeight, StatisticSnapshot
)

User = get_user_model()


# Кастомные формы для фильтрации пользователей по ролям
class ProjectWorkForm(forms.ModelForm):
    """Форма для работы участника - показывает только участников (participant) мероприятия."""
    class Meta:
        model = ProjectWork
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Для нового объекта или при выборе мероприятия
        if 'event' in self.data:
            try:
                event_id = int(self.data.get('event'))
                # Получаем всех participants для этого мероприятия
                participant_ids = EventParticipant.objects.filter(
                    event_id=event_id,
                    role='participant',
                    is_confirmed=True
                ).values_list('user_id', flat=True)
                
                if participant_ids:
                    self.fields['participant'].queryset = User.objects.filter(
                        id__in=participant_ids
                    )
            except (ValueError, TypeError):
                pass
        elif self.instance and self.instance.pk and self.instance.event:
            # Для существующего объекта
            participant_ids = EventParticipant.objects.filter(
                event=self.instance.event,
                role='participant',
                is_confirmed=True
            ).values_list('user_id', flat=True)
            
            if participant_ids:
                self.fields['participant'].queryset = User.objects.filter(
                    id__in=participant_ids
                )


class EvaluationForm(forms.ModelForm):
    """Форма для оценки - показывает только судей (referee) мероприятия."""
    class Meta:
        model = Evaluation
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Для нового объекта или при выборе проекта
        if 'project' in self.data:
            try:
                project_id = int(self.data.get('project'))
                from .models import ProjectWork
                project = ProjectWork.objects.get(id=project_id)
                
                # Получаем всех referee для этого мероприятия
                referee_ids = EventParticipant.objects.filter(
                    event=project.event,
                    role='referee',
                    is_confirmed=True
                ).values_list('user_id', flat=True)
                
                if referee_ids:
                    self.fields['judge'].queryset = User.objects.filter(
                        id__in=referee_ids
                    )
            except (ValueError, TypeError, ProjectWork.DoesNotExist):
                pass
        elif self.instance and self.instance.pk and self.instance.project:
            # Для существующего объекта
            referee_ids = EventParticipant.objects.filter(
                event=self.instance.project.event,
                role='referee',
                is_confirmed=True
            ).values_list('user_id', flat=True)
            
            if referee_ids:
                self.fields['judge'].queryset = User.objects.filter(
                    id__in=referee_ids
                )


class JudgeWeightForm(forms.ModelForm):
    """Форма для веса судьи - показывает только судей (referee) мероприятия."""
    class Meta:
        model = JudgeWeight
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Для нового объекта или при выборе мероприятия
        if 'event' in self.data:
            try:
                event_id = int(self.data.get('event'))
                # Получаем всех referee для этого мероприятия
                referee_ids = EventParticipant.objects.filter(
                    event_id=event_id,
                    role='referee',
                    is_confirmed=True
                ).values_list('user_id', flat=True)
                
                if referee_ids:
                    self.fields['judge'].queryset = User.objects.filter(
                        id__in=referee_ids
                    )
            except (ValueError, TypeError):
                pass
        elif self.instance and self.instance.pk and self.instance.event:
            # Для существующего объекта
            referee_ids = EventParticipant.objects.filter(
                event=self.instance.event,
                role='referee',
                is_confirmed=True
            ).values_list('user_id', flat=True)
            
            if referee_ids:
                self.fields['judge'].queryset = User.objects.filter(
                    id__in=referee_ids
                )


# Inline формы
class ProjectWorkInline(admin.TabularInline):
    """Inline для отображения работ в админке мероприятия."""
    model = ProjectWork
    form = ProjectWorkForm
    extra = 0
    fields = ['participant', 'title', 'status', 'is_published']
    readonly_fields = ['submitted_at']
    show_change_link = True
    raw_id_fields = ['participant']


class EvaluationCriteriaInline(admin.TabularInline):
    """Inline для отображения критериев в админке мероприятия."""
    model = EvaluationCriteria
    extra = 1
    fields = ['name', 'max_score', 'weight', 'is_active']
    show_change_link = True


class EvaluationInline(admin.TabularInline):
    """Inline для отображения оценок в админке работы."""
    model = Evaluation
    form = EvaluationForm
    extra = 0
    fields = ['judge', 'criteria', 'score', 'is_confirmed']
    readonly_fields = ['evaluated_at']
    show_change_link = True
    raw_id_fields = ['judge', 'criteria', 'session']


class JudgeWeightInline(admin.TabularInline):
    """Inline для отображения весов судей в админке мероприятия."""
    model = JudgeWeight
    form = JudgeWeightForm
    extra = 0
    fields = ['judge', 'weight', 'calculation_method']
    readonly_fields = ['calculated_at']
    show_change_link = True
    raw_id_fields = ['judge']


# Основные админ-классы
@admin.register(ProjectWork)
class ProjectWorkAdmin(admin.ModelAdmin):
    """Админка для работ участников."""
    form = ProjectWorkForm
    
    list_display = [
        'id', 'title', 'show_event', 'show_participant', 'status', 'submitted_at'
    ]
    
    list_filter = ['status', 'is_published', 'event']
    search_fields = ['title', 'participant__email', 'event__name']
    
    # Прямые связи (не raw_id_fields чтобы видеть в списке)
    autocomplete_fields = ['event', 'participant']
    
    readonly_fields = ['submitted_at', 'updated_at']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('event', 'participant', 'title', 'description')
        }),
        ('Файлы', {
            'fields': ('file', 'file_url'),
            'classes': ('collapse',),
        }),
        ('Статус', {
            'fields': ('status', 'category', 'is_published')
        }),
        ('Даты', {
            'fields': ('submitted_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    inlines = [EvaluationInline]
    
    def show_event(self, obj):
        """Показывает мероприятие."""
        return f"{obj.event.name} (ID: {obj.event.id})" if obj.event else "-"
    show_event.short_description = 'Мероприятие'
    
    def show_participant(self, obj):
        """Показывает участника."""
        return f"{obj.participant.email} (ID: {obj.participant.id})" if obj.participant else "-"
    show_participant.short_description = 'Участник'
    
    def get_queryset(self, request):
        """Оптимизация запросов."""
        return super().get_queryset(request).select_related('event', 'participant')


@admin.register(EvaluationCriteria)
class EvaluationCriteriaAdmin(admin.ModelAdmin):
    """Админка для критериев оценки."""
    
    list_display = ['id', 'name', 'show_event', 'max_score', 'weight', 'is_active']
    list_filter = ['is_active', 'event']
    search_fields = ['name', 'event__name']
    
    # Прямая связь
    autocomplete_fields = ['event']
    
    readonly_fields = ['created_at', 'updated_at']
    
    def show_event(self, obj):
        """Показывает мероприятие."""
        return f"{obj.event.name} (ID: {obj.event.id})" if obj.event else "-"
    show_event.short_description = 'Мероприятие'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('event')


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    """Админка для оценок судей."""
    form = EvaluationForm
    
    list_display = [
        'id', 'show_project', 'show_judge', 'show_criteria', 'score', 'is_confirmed'
    ]
    
    list_filter = ['is_confirmed', 'criteria', 'project__event']
    search_fields = ['project__title', 'judge__email', 'criteria__name']
    
    # Прямые связи
    autocomplete_fields = ['project', 'judge', 'criteria', 'session']
    
    readonly_fields = ['evaluated_at', 'confirmed_at']
    
    fieldsets = (
        ('Оценка', {
            'fields': ('project', 'judge', 'criteria', 'score', 'comment')
        }),
        ('Сессия', {
            'fields': ('session',),
            'classes': ('collapse',),
        }),
        ('Статус', {
            'fields': ('is_confirmed', 'confirmed_at')
        }),
        ('Даты', {
            'fields': ('evaluated_at',),
            'classes': ('collapse',),
        }),
    )
    
    def show_project(self, obj):
        """Показывает работу."""
        return f"{obj.project.title} (ID: {obj.project.id})" if obj.project else "-"
    show_project.short_description = 'Работа'
    
    def show_judge(self, obj):
        """Показывает судью."""
        return f"{obj.judge.email} (ID: {obj.judge.id})" if obj.judge else "-"
    show_judge.short_description = 'Судья'
    
    def show_criteria(self, obj):
        """Показывает критерий."""
        return f"{obj.criteria.name} (ID: {obj.criteria.id})" if obj.criteria else "-"
    show_criteria.short_description = 'Критерий'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'project', 'judge', 'criteria', 'session'
        )


@admin.register(CachedStatistic)
class CachedStatisticAdmin(admin.ModelAdmin):
    """Админка для кэшированной статистики."""
    
    list_display = ['id', 'show_event', 'statistic_type', 'calculated_at']
    list_filter = ['statistic_type', 'event']
    search_fields = ['event__name']
    
    # Прямая связь
    autocomplete_fields = ['event']
    
    readonly_fields = ['calculated_at', 'version', 'data']
    
    def show_event(self, obj):
        """Показывает мероприятие."""
        return f"{obj.event.name} (ID: {obj.event.id})" if obj.event else "-"
    show_event.short_description = 'Мероприятие'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('event')


@admin.register(JudgeWeight)
class JudgeWeightAdmin(admin.ModelAdmin):
    """Админка для весов судей."""
    form = JudgeWeightForm
    
    list_display = ['id', 'show_judge', 'show_event', 'weight', 'calculation_method']
    list_filter = ['calculation_method', 'event']
    search_fields = ['judge__email', 'event__name']
    
    # Прямые связи
    autocomplete_fields = ['judge', 'event']
    
    readonly_fields = ['calculated_at']
    
    def show_judge(self, obj):
        """Показывает судью."""
        return f"{obj.judge.email} (ID: {obj.judge.id})" if obj.judge else "-"
    show_judge.short_description = 'Судья'
    
    def show_event(self, obj):
        """Показывает мероприятие."""
        return f"{obj.event.name} (ID: {obj.event.id})" if obj.event else "-"
    show_event.short_description = 'Мероприятие'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('judge', 'event')


@admin.register(StatisticSnapshot)
class StatisticSnapshotAdmin(admin.ModelAdmin):
    """Админка для снимков статистики."""
    
    list_display = ['id', 'show_event', 'snapshot_type', 'taken_at']
    list_filter = ['snapshot_type', 'event']
    search_fields = ['event__name', 'notes']
    
    # Прямая связь
    autocomplete_fields = ['event']
    
    readonly_fields = ['created_at', 'data']
    
    def show_event(self, obj):
        """Показывает мероприятие."""
        return f"{obj.event.name} (ID: {obj.event.id})" if obj.event else "-"
    show_event.short_description = 'Мероприятие'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('event')


# Если хотите добавить Inline в админку мероприятий, добавьте в events/admin.py:
"""
from stats.admin import (
    ProjectWorkInline,
    EvaluationCriteriaInline,
    JudgeWeightInline
)

# В класс EventAdmin добавьте:
inlines = [
    EvaluationCriteriaInline,
    ProjectWorkInline, 
    JudgeWeightInline
]
"""
