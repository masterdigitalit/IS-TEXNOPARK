from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db import models
from django.db.models import Count
from .models import (
    Event, EventParticipant, OnlineEventInfo, 
    SessionAttendance, SessionMaterial
)


# Inline формы
class EventParticipantInline(admin.TabularInline):
    """Inline для участников события"""
    model = EventParticipant
    extra = 0
    fields = ['user', 'role', 'is_confirmed', 'registered_at']
    readonly_fields = ['registered_at']
    can_delete = True
    show_change_link = True
    classes = ['collapse']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


class OnlineEventInfoInline(admin.StackedInline):
    """Inline для онлайн-сессий"""
    model = OnlineEventInfo
    extra = 0
    fields = [
        'session_name', 'start_time', 'end_time', 
        'link', 'platform', 'status', 'is_active'
    ]
    readonly_fields = ['status']
    show_change_link = True
    classes = ['collapse']


class SessionAttendanceInline(admin.TabularInline):
    """Inline для посещаемости сессий"""
    model = SessionAttendance
    extra = 0
    fields = ['participant', 'status', 'joined_at', 'left_at', 'rating']
    readonly_fields = ['joined_at']
    can_delete = False
    classes = ['collapse']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('participant')


class SessionMaterialInline(admin.TabularInline):
    """Inline для материалов сессий"""
    model = SessionMaterial
    extra = 0
    fields = ['title', 'material_type', 'file', 'file_url', 'is_public']
    readonly_fields = ['uploaded_at']
    classes = ['collapse']


# Фильтры для админки
class IsOpenFilter(admin.SimpleListFilter):
    """Фильтр для событий (открыто/закрыто)"""
    title = 'Статус регистрации'
    parameter_name = 'is_open'
    
    def lookups(self, request, model_admin):
        return (
            ('open', 'Открыто'),
            ('closed', 'Закрыто'),
        )
    
    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == 'open':
            return queryset.filter(
                models.Q(closes_at__isnull=True) | 
                models.Q(closes_at__gt=now)
            )
        if self.value() == 'closed':
            return queryset.filter(closes_at__lte=now)
        return queryset


class IsOngoingFilter(admin.SimpleListFilter):
    """Фильтр для сессий (идет сейчас/нет)"""
    title = 'Идет сейчас'
    parameter_name = 'is_ongoing'
    
    def lookups(self, request, model_admin):
        return (
            ('yes', 'Идет'),
            ('no', 'Не идет'),
        )
    
    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == 'yes':
            return queryset.filter(
                start_time__lte=now,
                end_time__gte=now,
                status='ongoing',
                is_active=True
            )
        if self.value() == 'no':
            return queryset.exclude(
                start_time__lte=now,
                end_time__gte=now,
                status='ongoing',
                is_active=True
            )
        return queryset


# Основные админ-классы
@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    """Админ-класс для событий"""
    list_display = [
        'name', 'owner_safe_link', 'status_display', 'is_open_display',
        'participant_count', 'online_sessions_count', 
        'created_at_display', 'is_active_display'
    ]
    
    list_filter = [
        'status', 'is_active', IsOpenFilter,
        'created_at', 'owner'
    ]
    
    search_fields = [
        'name', 'description', 'owner__username', 
        'owner__email', 'owner__first_name', 'owner__last_name'
    ]
    
    list_select_related = ['owner']
    
    date_hierarchy = 'created_at'
    
    # Методы для readonly_fields (detail view) - русские отображения
    @admin.display(description='Открыто')
    def is_open_readonly(self, obj):
        if obj.is_open:
            return format_html('<span style="color: green;">✓ Да</span>')
        return format_html('<span style="color: red;">✗ Нет</span>')
    
    @admin.display(description='Есть онлайн сессии')
    def has_online_sessions_readonly(self, obj):
        if obj.has_online_sessions:
            return format_html('<span style="color: green;">✓ Да</span>')
        return format_html('<span style="color: red;">✗ Нет</span>')
    
    @admin.display(description='Предстоящие сессии')
    def upcoming_sessions_readonly(self, obj):
        count = obj.upcoming_online_sessions.count()
        if count > 0:
            return format_html(f'<span style="color: blue;">{count}</span>')
        return format_html(f'<span style="color: gray;">{count}</span>')
    
    @admin.display(description='Текущие сессии')
    def ongoing_sessions_readonly(self, obj):
        count = obj.ongoing_online_sessions.count()
        if count > 0:
            return format_html(f'<span style="color: green;">{count}</span>')
        return format_html(f'<span style="color: gray;">{count}</span>')
    
    readonly_fields = [
        'created_at', 'updated_at', 
        'is_open_readonly', 'has_online_sessions_readonly',
        'upcoming_sessions_readonly', 'ongoing_sessions_readonly'
    ]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'description', 'owner', 'image_url')
        }),
        ('Даты и время', {
            'fields': ('created_at', 'updated_at', 'closes_at')
        }),
        ('Статус', {
            'fields': ('status', 'is_active')
        }),
        ('Статистика', {
            'fields': (
                'is_open_readonly', 
                'has_online_sessions_readonly', 
                'upcoming_sessions_readonly', 
                'ongoing_sessions_readonly'
            ),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [EventParticipantInline, OnlineEventInfoInline]
    
    actions = ['publish_selected', 'archive_selected', 'duplicate_selected']
    
    # Исправленный метод owner_link
    @admin.display(description='Организатор')
    def owner_safe_link(self, obj):
        if not obj.owner:
            return "—"
        
        try:
            url = f'/admin/auth/user/{obj.owner.id}/change/'
            # Безопасное получение имени пользователя
            if hasattr(obj.owner, 'get_full_name') and obj.owner.get_full_name():
                display_name = obj.owner.get_full_name()
            elif hasattr(obj.owner, 'username'):
                display_name = obj.owner.username
            elif hasattr(obj.owner, 'email'):
                display_name = obj.owner.email
            else:
                display_name = str(obj.owner)
            
            return format_html(
                '<a href="{}">{}</a>',
                url,
                display_name
            )
        except (AttributeError, KeyError):
            return str(obj.owner)
    
    @admin.display(description='Статус', ordering='status')
    def status_display(self, obj):
        colors = {
            'draft': 'gray',
            'published': 'green',
            'cancelled': 'red',
            'completed': 'blue',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    
    @admin.display(description='Открыто')
    def is_open_display(self, obj):
        if obj.is_open:
            return format_html(
                '<span style="color: green;">✓ Открыто</span>'
            )
        return format_html(
            '<span style="color: red;">✗ Закрыто</span>'
        )
    
    @admin.display(description='Участники')
    def participant_count(self, obj):
        try:
            count = obj.event_participants.count()
            url = f'/admin/events/eventparticipant/?event__id={obj.id}'
            return format_html(
                '<a href="{}">{}</a>',
                url,
                count
            )
        except Exception:
            return "0"
    
    @admin.display(description='Онлайн сессии')
    def online_sessions_count(self, obj):
        try:
            count = obj.online_sessions.count()
            if count > 0:
                url = f'/admin/events/onlineeventinfo/?event__id={obj.id}'
                return format_html(
                    '<a href="{}">{}</a>',
                    url,
                    count
                )
            return count
        except Exception:
            return "0"
    
    @admin.display(description='Создано', ordering='created_at')
    def created_at_display(self, obj):
        return obj.created_at.strftime('%d.%m.%Y %H:%M') if obj.created_at else "—"
    
    @admin.display(description='Активно')
    def is_active_display(self, obj):
        if obj.is_active:
            return format_html('<span style="color: green;">✓ Да</span>')
        return format_html('<span style="color: red;">✗ Нет</span>')
    
    # Действия
    @admin.action(description='Опубликовать выбранные события')
    def publish_selected(self, request, queryset):
        updated = queryset.update(status='published')
        self.message_user(
            request, 
            f'Опубликовано {updated} событий'
        )
    
    @admin.action(description='Архивировать выбранные события')
    def archive_selected(self, request, queryset):
        updated = queryset.update(status='completed', is_active=False)
        self.message_user(
            request, 
            f'Заархивировано {updated} событий'
        )
    
    @admin.action(description='Дублировать выбранные события')
    def duplicate_selected(self, request, queryset):
        duplicated = 0
        for event in queryset:
            # Создаем копию без id
            event.pk = None
            event.name = f"{event.name} (копия)"
            event.status = 'draft'
            event.created_at = timezone.now()
            event.updated_at = timezone.now()
            event.save()
            duplicated += 1
        self.message_user(
            request, 
            f'Дублировано {duplicated} событий'
        )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.select_related('owner')
        qs = qs.prefetch_related('event_participants', 'online_sessions')
        return qs


@admin.register(OnlineEventInfo)
class OnlineEventInfoAdmin(admin.ModelAdmin):
    """Админ-класс для онлайн-сессий"""
    list_display = [
        'session_name', 'event_safe_link', 'start_time_display',
        'end_time_display', 'duration_display', 'status_display',
        'is_ongoing_display', 'platform_display', 'is_active_display'
    ]
    
    list_filter = [
        'status', 'platform', 'is_active', IsOngoingFilter,
        'start_time', 'event'
    ]
    
    search_fields = [
        'session_name', 'session_notes', 'event__name',
        'event__owner__username', 'access_code'
    ]
    
    list_select_related = ['event', 'event__owner']
    
    date_hierarchy = 'start_time'
    
    # Методы для readonly_fields (detail view) - русские отображения
    @admin.display(description='Идет сейчас')
    def is_ongoing_readonly(self, obj):
        if obj.is_ongoing:
            return format_html('<span style="color: green;">✓ Да</span>')
        return format_html('<span style="color: gray;">✗ Нет</span>')
    
    @admin.display(description='Запланирована')
    def is_upcoming_readonly(self, obj):
        if obj.is_upcoming:
            return format_html('<span style="color: blue;">✓ Да</span>')
        return format_html('<span style="color: gray;">✗ Нет</span>')
    
    @admin.display(description='Завершена')
    def is_past_readonly(self, obj):
        if obj.is_past:
            return format_html('<span style="color: gray;">✓ Да</span>')
        return format_html('<span style="color: blue;">✗ Нет</span>')
    
    readonly_fields = [
        'created_at', 'updated_at', 'duration_minutes',
        'is_ongoing_readonly', 'is_upcoming_readonly', 'is_past_readonly'
    ]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('event', 'session_name', 'session_notes')
        }),
        ('Время проведения', {
            'fields': ('start_time', 'end_time', 'duration_minutes')
        }),
        ('Подключение', {
            'fields': ('link', 'platform', 'access_code')
        }),
        ('Статус и ограничения', {
            'fields': ('status', 'max_participants', 'is_active')
        }),
        ('Системная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Статус сессии', {
            'fields': ('is_ongoing_readonly', 'is_upcoming_readonly', 'is_past_readonly'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [SessionAttendanceInline, SessionMaterialInline]
    
    actions = ['start_selected', 'complete_selected', 'cancel_selected']
    
    # Исправленный метод event_link
    @admin.display(description='Событие', ordering='event__name')
    def event_safe_link(self, obj):
        if not obj.event:
            return "—"
        
        try:
            url = f'/admin/events/event/{obj.event.id}/change/'
            return format_html(
                '<a href="{}">{}</a>',
                url,
                obj.event.name
            )
        except Exception:
            return str(obj.event)
    
    @admin.display(description='Начало', ordering='start_time')
    def start_time_display(self, obj):
        return obj.start_time.strftime('%d.%m.%Y %H:%M') if obj.start_time else "—"
    
    @admin.display(description='Окончание')
    def end_time_display(self, obj):
        if obj.end_time:
            return obj.end_time.strftime('%d.%m.%Y %H:%M')
        return '—'
    
    @admin.display(description='Длительность')
    def duration_display(self, obj):
        if obj.duration_minutes:
            hours = obj.duration_minutes // 60
            minutes = obj.duration_minutes % 60
            if hours > 0:
                return f'{hours}ч {minutes}мин'
            return f'{minutes} мин'
        return '—'
    
    @admin.display(description='Статус')
    def status_display(self, obj):
        colors = {
            'scheduled': 'blue',
            'ongoing': 'green',
            'completed': 'gray',
            'cancelled': 'red',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    
    @admin.display(description='Идет сейчас')
    def is_ongoing_display(self, obj):
        if obj.is_ongoing:
            return format_html(
                '<span style="color: green;">✓ Идет</span>'
            )
        return format_html(
            '<span style="color: gray;">— Не идет</span>'
        )
    
    @admin.display(description='Платформа')
    def platform_display(self, obj):
        platforms = {
            'zoom': '🔵 Zoom',
            'teams': '🟣 Teams',
            'meet': '🔴 Meet',
            'webex': '🟢 Webex',
            'jitsi': '🟡 Jitsi',
            'other': '⚫ Другая',
        }
        return platforms.get(obj.platform, obj.get_platform_display())
    
    @admin.display(description='Активна')
    def is_active_display(self, obj):
        if obj.is_active:
            return format_html('<span style="color: green;">✓ Да</span>')
        return format_html('<span style="color: red;">✗ Нет</span>')
    
    # Действия
    @admin.action(description='Начать выбранные сессии')
    def start_selected(self, request, queryset):
        now = timezone.now()
        updated = queryset.update(status='ongoing', start_time=now)
        self.message_user(request, f'Начато {updated} сессий')
    
    @admin.action(description='Завершить выбранные сессии')
    def complete_selected(self, request, queryset):
        now = timezone.now()
        updated = queryset.update(status='completed', end_time=now)
        self.message_user(request, f'Завершено {updated} сессий')
    
    @admin.action(description='Отменить выбранные сессии')
    def cancel_selected(self, request, queryset):
        updated = queryset.update(status='cancelled')
        self.message_user(request, f'Отменено {updated} сессий')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.select_related('event', 'event__owner')
        qs = qs.annotate(attendance_count=Count('attendances'))
        return qs


@admin.register(EventParticipant)
class EventParticipantAdmin(admin.ModelAdmin):
    """Админ-класс для участников событий"""
    list_display = [
        'user_safe_link', 'event_safe_link', 'role_display',
        'is_confirmed_display', 'registered_at_display'
    ]
    
    list_filter = [
        'is_confirmed', 'role', 'registered_at', 'event'
    ]
    
    search_fields = [
        'user__username', 'user__email', 'user__first_name',
        'user__last_name', 'event__name'
    ]
    
    list_select_related = ['user', 'event']
    
    date_hierarchy = 'registered_at'
    
    readonly_fields = ['registered_at']
    
    fieldsets = (
        ('Участник и событие', {
            'fields': ('user', 'event')
        }),
        ('Информация об участии', {
            'fields': ('role', 'is_confirmed')
        }),
        ('Системная информация', {
            'fields': ('registered_at',),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['confirm_selected', 'unconfirm_selected']
    
    # Исправленный метод user_link
    @admin.display(description='Участник', ordering='user__username')
    def user_safe_link(self, obj):
        if not obj.user:
            return "—"
        
        try:
            url = f'/admin/auth/user/{obj.user.id}/change/'
            # Безопасное получение имени
            if hasattr(obj.user, 'get_full_name') and obj.user.get_full_name():
                display_name = obj.user.get_full_name()
            elif hasattr(obj.user, 'username'):
                display_name = obj.user.username
            elif hasattr(obj.user, 'email'):
                display_name = obj.user.email
            else:
                display_name = str(obj.user)
            
            return format_html(
                '<a href="{}">{}</a>',
                url,
                display_name
            )
        except Exception:
            return str(obj.user)
    
    # Исправленный метод event_link
    @admin.display(description='Событие', ordering='event__name')
    def event_safe_link(self, obj):
        if not obj.event:
            return "—"
        
        try:
            url = f'/admin/events/event/{obj.event.id}/change/'
            return format_html(
                '<a href="{}">{}</a>',
                url,
                obj.event.name
            )
        except Exception:
            return str(obj.event)
    
    @admin.display(description='Роль')
    def role_display(self, obj):
        colors = {
            'participant': 'blue',
            'speaker': 'green',
            'organizer': 'orange',
            'volunteer': 'purple',
        }
        color = colors.get(obj.role, 'black')
        return format_html(
            '<span style="color: {};">{}</span>',
            color,
            obj.get_role_display()
        )
    
    @admin.display(description='Подтверждено')
    def is_confirmed_display(self, obj):
        if obj.is_confirmed:
            return format_html(
                '<span style="color: green;">✓ Да</span>'
            )
        return format_html(
            '<span style="color: red;">✗ Нет</span>'
        )
    
    @admin.display(description='Зарегистрирован', ordering='registered_at')
    def registered_at_display(self, obj):
        return obj.registered_at.strftime('%d.%m.%Y %H:%M') if obj.registered_at else "—"
    
    # Действия
    @admin.action(description='Подтвердить выбранных участников')
    def confirm_selected(self, request, queryset):
        updated = queryset.update(is_confirmed=True)
        self.message_user(request, f'Подтверждено {updated} участников')
    
    @admin.action(description='Снять подтверждение')
    def unconfirm_selected(self, request, queryset):
        updated = queryset.update(is_confirmed=False)
        self.message_user(request, f'Снято подтверждение с {updated} участников')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.select_related('user', 'event')
        return qs


@admin.register(SessionAttendance)
class SessionAttendanceAdmin(admin.ModelAdmin):
    """Админ-класс для посещаемости сессий"""
    list_display = [
        'participant_safe_link', 'session_safe_link', 'status_display',
        'joined_at_display', 'left_at_display', 'duration_display',
        'rating_display'
    ]
    
    list_filter = [
        'status', 'session__session_name', 'joined_at', 'rating'
    ]
    
    search_fields = [
        'participant__username', 'participant__email',
        'session__session_name', 'session__event__name',
        'feedback'
    ]
    
    list_select_related = ['participant', 'session', 'session__event']
    
    date_hierarchy = 'joined_at'
    
    readonly_fields = ['joined_at', 'duration_seconds']
    
    fieldsets = (
        ('Посещение', {
            'fields': ('participant', 'session')
        }),
        ('Время присутствия', {
            'fields': ('joined_at', 'left_at', 'duration_seconds')
        }),
        ('Статус и оценка', {
            'fields': ('status', 'rating', 'feedback')
        }),
    )
    
    actions = ['mark_completed', 'mark_no_show']
    
    # Исправленный метод participant_link
    @admin.display(description='Участник', ordering='participant__username')
    def participant_safe_link(self, obj):
        if not obj.participant:
            return "—"
        
        try:
            url = f'/admin/auth/user/{obj.participant.id}/change/'
            if hasattr(obj.participant, 'username'):
                display_name = obj.participant.username
            elif hasattr(obj.participant, 'email'):
                display_name = obj.participant.email
            else:
                display_name = str(obj.participant)
            
            return format_html(
                '<a href="{}">{}</a>',
                url,
                display_name
            )
        except Exception:
            return str(obj.participant)
    
    # Исправленный метод session_link
    @admin.display(description='Сессия', ordering='session__session_name')
    def session_safe_link(self, obj):
        if not obj.session:
            return "—"
        
        try:
            url = f'/admin/events/onlineeventinfo/{obj.session.id}/change/'
            return format_html(
                '<a href="{}">{}</a>',
                url,
                obj.session.session_name
            )
        except Exception:
            return str(obj.session)
    
    @admin.display(description='Статус')
    def status_display(self, obj):
        colors = {
            'registered': 'blue',
            'joined': 'green',
            'left': 'orange',
            'completed': 'gray',
            'no_show': 'red',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {};">{}</span>',
            color,
            obj.get_status_display()
        )
    
    @admin.display(description='Присоединился', ordering='joined_at')
    def joined_at_display(self, obj):
        return obj.joined_at.strftime('%d.%m.%Y %H:%M') if obj.joined_at else "—"
    
    @admin.display(description='Вышел')
    def left_at_display(self, obj):
        if obj.left_at:
            return obj.left_at.strftime('%d.%m.%Y %H:%M')
        return '—'
    
    @admin.display(description='Длительность')
    def duration_display(self, obj):
        if obj.duration_seconds:
            minutes = obj.duration_seconds // 60
            seconds = obj.duration_seconds % 60
            return f'{minutes}:{seconds:02d}'
        return '—'
    
    @admin.display(description='Оценка')
    def rating_display(self, obj):
        if obj.rating:
            stars = '★' * obj.rating + '☆' * (5 - obj.rating)
            return format_html(
                '<span style="color: gold; font-size: 14px;">{}</span>',
                stars
            )
        return '—'
    
    # Действия
    @admin.action(description='Отметить как завершивших')
    def mark_completed(self, request, queryset):
        updated = queryset.update(status='completed')
        self.message_user(request, f'Отмечено {updated} участников как завершивших')
    
    @admin.action(description='Отметить как неявившихся')
    def mark_no_show(self, request, queryset):
        updated = queryset.update(status='no_show')
        self.message_user(request, f'Отмечено {updated} участников как неявившихся')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.select_related('participant', 'session', 'session__event')
        return qs


@admin.register(SessionMaterial)
class SessionMaterialAdmin(admin.ModelAdmin):
    """Админ-класс для материалов сессий"""
    list_display = [
        'title', 'session_safe_link', 'material_type_display',
        'file_display', 'uploaded_by_safe_link', 'uploaded_at_display',
        'is_public_display'
    ]
    
    list_filter = [
        'material_type', 'is_public', 'uploaded_at', 'session'
    ]
    
    search_fields = [
        'title', 'description', 'session__session_name',
        'uploaded_by__username', 'file_url'
    ]
    
    list_select_related = ['session', 'uploaded_by', 'session__event']
    
    date_hierarchy = 'uploaded_at'
    
    readonly_fields = ['uploaded_at', 'file_display']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'description', 'session')
        }),
        ('Материал', {
            'fields': ('material_type', 'file', 'file_url', 'file_display')
        }),
        ('Дополнительно', {
            'fields': ('uploaded_by', 'is_public', 'uploaded_at')
        }),
    )
    
    actions = ['make_public', 'make_private']
    
    # Исправленный метод session_link
    @admin.display(description='Сессия', ordering='session__session_name')
    def session_safe_link(self, obj):
        if not obj.session:
            return "—"
        
        try:
            url = f'/admin/events/onlineeventinfo/{obj.session.id}/change/'
            return format_html(
                '<a href="{}">{}</a>',
                url,
                obj.session.session_name
            )
        except Exception:
            return str(obj.session)
    
    @admin.display(description='Тип материала')
    def material_type_display(self, obj):
        icons = {
            'presentation': '📊',
            'document': '📄',
            'video': '🎬',
            'audio': '🎵',
            'link': '🔗',
            'other': '📁',
        }
        icon = icons.get(obj.material_type, '📁')
        return f"{icon} {obj.get_material_type_display()}"
    
    @admin.display(description='Файл')
    def file_display(self, obj):
        try:
            if obj.file:
                return format_html(
                    '<a href="{}" target="_blank">📎 {}</a>',
                    obj.file.url,
                    obj.file.name.split('/')[-1][:30]
                )
            elif obj.file_url:
                return format_html(
                    '<a href="{}" target="_blank">🌐 Ссылка</a>',
                    obj.file_url
                )
        except Exception:
            pass
        return '—'
    
    # Исправленный метод uploaded_by_link
    @admin.display(description='Загрузил', ordering='uploaded_by__username')
    def uploaded_by_safe_link(self, obj):
        if not obj.uploaded_by:
            return "—"
        
        try:
            url = f'/admin/auth/user/{obj.uploaded_by.id}/change/'
            if hasattr(obj.uploaded_by, 'username'):
                display_name = obj.uploaded_by.username
            else:
                display_name = str(obj.uploaded_by)
            
            return format_html(
                '<a href="{}">{}</a>',
                url,
                display_name
            )
        except Exception:
            return str(obj.uploaded_by)
    
    @admin.display(description='Загружен', ordering='uploaded_at')
    def uploaded_at_display(self, obj):
        return obj.uploaded_at.strftime('%d.%m.%Y %H:%M') if obj.uploaded_at else "—"
    
    @admin.display(description='Публичный')
    def is_public_display(self, obj):
        if obj.is_public:
            return format_html(
                '<span style="color: green;">✓ Да</span>'
            )
        return format_html(
            '<span style="color: red;">✗ Нет</span>'
        )
    
    # Действия
    @admin.action(description='Сделать публичными')
    def make_public(self, request, queryset):
        updated = queryset.update(is_public=True)
        self.message_user(request, f'{updated} материалов стали публичными')
    
    @admin.action(description='Сделать приватными')
    def make_private(self, request, queryset):
        updated = queryset.update(is_public=False)
        self.message_user(request, f'{updated} материалов стали приватными')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.select_related('session', 'uploaded_by', 'session__event')
        return qs


# Дополнительная настройка админ-сайта
admin.site.site_header = 'Панель управления событиями'
admin.site.site_title = 'Админка событий'
admin.site.index_title = 'Добро пожаловать в панель управления'