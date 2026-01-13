# events/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Count, Q
from .models import (
    Event, EventParticipant, OnlineEventInfo, OfflineSessionsInfo,
    SessionAttendance, SessionMaterial, EventFile
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


class OfflineSessionsInfoInline(admin.StackedInline):
    """Inline для оффлайн-сессий"""
    model = OfflineSessionsInfo
    extra = 0
    fields = [
        'session_name', 'start_time', 'end_time', 
        'address', 'room', 'status', 'is_active'
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


class EventFileInline(admin.TabularInline):
    """Inline для файлов событий"""
    model = EventFile
    extra = 0
    fields = ['storage_file', 'category', 'description', 'is_public', 'display_order']
    readonly_fields = ['uploaded_at']
    show_change_link = True
    classes = ['collapse']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('storage_file', 'uploaded_by')


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
                Q(registration_ends_at__isnull=True) | 
                Q(registration_ends_at__gt=now),
                status='published',
                is_active=True
            )
        if self.value() == 'closed':
            return queryset.filter(
                Q(registration_ends_at__lte=now) |
                Q(status='completed') |
                Q(status='cancelled')
            )
        return queryset


class IsPrivateFilter(admin.SimpleListFilter):
    """Фильтр для событий (приватное/публичное)"""
    title = 'Тип мероприятия'
    parameter_name = 'is_private'
    
    def lookups(self, request, model_admin):
        return (
            ('private', 'Приватное'),
            ('public', 'Публичное'),
        )
    
    def queryset(self, request, queryset):
        if self.value() == 'private':
            return queryset.filter(is_private=True)
        if self.value() == 'public':
            return queryset.filter(is_private=False)
        return queryset


class RegistrationStatusFilter(admin.SimpleListFilter):
    """Фильтр по статусу регистрации"""
    title = 'Статус регистрации'
    parameter_name = 'registration_status'
    
    def lookups(self, request, model_admin):
        return (
            ('in_progress', 'Идет регистрация'),
            ('ended', 'Регистрация закрыта'),
            ('not_started', 'Не началась'),
        )
    
    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == 'in_progress':
            return queryset.filter(
                registration_ends_at__gt=now,
                status='published',
                is_active=True
            )
        elif self.value() == 'ended':
            return queryset.filter(
                registration_ends_at__lte=now,
                status='published'
            )
        elif self.value() == 'not_started':
            return queryset.filter(
                registration_ends_at__isnull=True,
                status='published'
            )
        return queryset


class ResultsStatusFilter(admin.SimpleListFilter):
    """Фильтр по статусу результатов"""
    title = 'Статус результатов'
    parameter_name = 'results_status'
    
    def lookups(self, request, model_admin):
        return (
            ('published', 'Опубликованы'),
            ('in_preparation', 'В подготовке'),
            ('not_ready', 'Не готовы'),
        )
    
    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == 'published':
            return queryset.filter(
                results_published_at__lte=now,
                results_published_at__isnull=False
            )
        elif self.value() == 'in_preparation':
            return queryset.filter(
                results_published_at__gt=now,
                results_published_at__isnull=False
            )
        elif self.value() == 'not_ready':
            return queryset.filter(
                results_published_at__isnull=True
            )
        return queryset


class StageFilter(admin.SimpleListFilter):
    """Фильтр по текущему этапу события"""
    title = 'Текущий этап'
    parameter_name = 'current_stage'
    
    def lookups(self, request, model_admin):
        return (
            ('registration', 'Регистрация'),
            ('sessions', 'Сессии'),
            ('results', 'Результаты'),
            ('preparation', 'Подготовка'),
            ('completed', 'Завершено'),
        )
    
    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == 'registration':
            return queryset.filter(
                registration_ends_at__gt=now,
                status='published',
                is_active=True
            )
        elif self.value() == 'sessions':
            return queryset.filter(
                Q(online_sessions_status='ongoing') |
                Q(offline_sessions_status='ongoing'),
                status='published',
                is_active=True
            ).distinct()
        elif self.value() == 'results':
            return queryset.filter(
                results_published_at__isnull=False,
                status='published',
                is_active=True
            )
        elif self.value() == 'preparation':
            return queryset.filter(
                registration_ends_at__lte=now,
                online_sessions__isnull=True,
                offline_sessions__isnull=True,
                status='published',
                is_active=True
            )
        elif self.value() == 'completed':
            return queryset.filter(
                status='completed',
                is_active=False
            )
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


class SessionTypeFilter(admin.SimpleListFilter):
    """Фильтр по типу сессии (онлайн/оффлайн)"""
    title = 'Тип сессии'
    parameter_name = 'session_type'
    
    def lookups(self, request, model_admin):
        return (
            ('online', 'Онлайн'),
            ('offline', 'Оффлайн'),
        )
    
    def queryset(self, request, queryset):
        if self.value() == 'online':
            return queryset.filter(online_sessions__isnull=False).distinct()
        if self.value() == 'offline':
            return queryset.filter(offline_sessions__isnull=False).distinct()
        return queryset


class EventFileCategoryFilter(admin.SimpleListFilter):
    """Фильтр по категории файлов событий"""
    title = 'Категория файла'
    parameter_name = 'category'
    
    def lookups(self, request, model_admin):
        return EventFile.FILE_CATEGORIES
    
    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(category=self.value())
        return queryset


# Основные админ-классы
@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    """Админ-класс для событий"""
    list_display = [
        'name', 'owner_safe_link', 'status_display', 'is_private_display',
        'registration_status_display', 'results_status_display',
        'current_stage_display', 'progress_bar',
        'participant_count', 'online_sessions_count', 'offline_sessions_count',
        'files_count', 'created_at_display'
    ]
    
    list_filter = [
        'status', 'is_active', IsPrivateFilter, RegistrationStatusFilter, 
        ResultsStatusFilter, StageFilter, SessionTypeFilter,
        'created_at', 'owner'
    ]
    
    search_fields = [
        'name', 'description', 'owner__username', 
        'owner__email', 'owner__first_name', 'owner__last_name'
    ]
    
    list_select_related = ['owner']
    
    date_hierarchy = 'created_at'
    
    # Методы для readonly_fields (detail view)
    @admin.display(description='Открыто для регистрации')
    def is_open_readonly(self, obj):
        if obj.is_open:
            return format_html('<span style="color: green;">✓ Да</span>')
        return format_html('<span style="color: red;">✗ Нет</span>')
    
    @admin.display(description='Дата окончания регистрации')
    def registration_ends_at_readonly(self, obj):
        if obj.registration_ends_at:
            return obj.registration_ends_at.strftime('%d.%m.%Y %H:%M')
        return format_html('<span style="color: gray;">—</span>')
    
    @admin.display(description='Дата подведения итогов')
    def results_published_at_readonly(self, obj):
        if obj.results_published_at:
            return obj.results_published_at.strftime('%d.%m.%Y %H:%M')
        return format_html('<span style="color: gray;">—</span>')
    
    @admin.display(description='Дата окончания')
    def closes_at_readonly(self, obj):
        if obj.closes_at:
            return obj.closes_at.strftime('%d.%m.%Y %H:%M')
        return format_html('<span style="color: gray;">—</span>')
    
    @admin.display(description='Статус регистрации')
    def registration_status_readonly(self, obj):
        status = obj.registration_status
        if status['is_active']:
            return format_html(
                '<span style="color: green; font-weight: bold;">{}</span><br>'
                '<small style="color: #666;">До: {}</small>',
                status['display'],
                obj.registration_ends_at.strftime('%d.%m.%Y %H:%M') if obj.registration_ends_at else '—'
            )
        elif status['is_ended']:
            return format_html(
                '<span style="color: orange; font-weight: bold;">{}</span><br>'
                '<small style="color: #666;">Закрыта: {}</small>',
                status['display'],
                obj.registration_ends_at.strftime('%d.%m.%Y %H:%M') if obj.registration_ends_at else '—'
            )
        else:
            return format_html('<span style="color: gray;">{}</span>', status['display'])
    
    @admin.display(description='Статус результатов')
    def results_status_readonly(self, obj):
        status = obj.results_status
        if status['is_published']:
            return format_html(
                '<span style="color: green; font-weight: bold;">{}</span><br>'
                '<small style="color: #666;">Опубликованы: {}</small>',
                status['display'],
                obj.results_published_at.strftime('%d.%m.%Y %H:%M') if obj.results_published_at else '—'
            )
        elif status['status'] == 'in_preparation':
            return format_html(
                '<span style="color: blue; font-weight: bold;">{}</span><br>'
                '<small style="color: #666;">Ожидаются: {}</small>',
                status['display'],
                obj.results_published_at.strftime('%d.%m.%Y %H:%M') if obj.results_published_at else '—'
            )
        else:
            return format_html('<span style="color: gray;">{}</span>', status['display'])
    
    @admin.display(description='Статус сессий')
    def sessions_status_readonly(self, obj):
        status = obj.sessions_status
        if status['is_ongoing']:
            return format_html(
                '<span style="color: green; font-weight: bold;">{}</span><br>'
                '<small style="color: #666;">Идут онлайн: {}, офлайн: {}</small>',
                status['display'],
                obj.online_sessions.filter(status='ongoing').count(),
                obj.offline_sessions.filter(status='ongoing').count()
            )
        elif status['has_scheduled']:
            return format_html(
                '<span style="color: blue; font-weight: bold;">{}</span><br>'
                '<small style="color: #666;">Запланировано: {}</small>',
                status['display'],
                obj.online_sessions.filter(status='scheduled').count() + 
                obj.offline_sessions.filter(status='scheduled').count()
            )
        else:
            return format_html('<span style="color: gray;">{}</span>', status['display'])
    
    @admin.display(description='Текущий этап')
    def current_stage_readonly(self, obj):
        stage = obj.current_stage
        icons = {
            'registration': '📝',
            'sessions': '🎤',
            'results': '🏆',
            'preparation': '🛠️',
            'not_started': '⏸️',
            'unknown': '❓'
        }
        icon = icons.get(stage['name'], '📋')
        
        if stage['status'] == 'active':
            return format_html(
                '<span style="color: green; font-weight: bold;">{} {}</span><br>'
                '<small style="color: #666;">{}</small>',
                icon, stage['display'], stage.get('detail', '')
            )
        elif stage['status'] == 'completed':
            return format_html(
                '<span style="color: gray; font-weight: bold;">{} {}</span><br>'
                '<small style="color: #666;">Завершено</small>',
                icon, stage['display']
            )
        else:
            return format_html(
                '<span style="color: blue; font-weight: bold;">{} {}</span>',
                icon, stage['display']
            )
    
    @admin.display(description='Прогресс')
    def progress_percentage_readonly(self, obj):
        progress = obj.progress_percentage
        color = 'green' if progress >= 66 else 'orange' if progress >= 33 else 'blue'
        html_template = (
            '<div style="width: 200px; background: #e0e0e0; border-radius: 3px; overflow: hidden;">'
            '<div style="width: {}%; height: 20px; background: {}; text-align: center; line-height: 20px; color: white;">'
            '{}%'
            '</div>'
            '</div>'
        )
        return format_html(html_template, progress, color, progress)
    
    readonly_fields = [
        'created_at', 'updated_at', 
        'is_open_readonly', 'registration_ends_at_readonly', 
        'results_published_at_readonly', 'closes_at_readonly',
        'registration_status_readonly', 'sessions_status_readonly', 
        'results_status_readonly', 'current_stage_readonly', 
        'progress_percentage_readonly'
    ]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'description', 'owner', 'image_url')
        }),
        ('Даты и время', {
            'fields': ('created_at', 'updated_at', 'closes_at')
        }),
        ('Регистрация и результаты', {
            'fields': ('registration_ends_at', 'results_published_at'),
            'description': 'Укажите даты для отслеживания этапов события'
        }),
        ('Статус и доступ', {
            'fields': ('status', 'is_active', 'is_private')
        }),
        ('Статусы и прогресс', {
            'fields': (
                'is_open_readonly', 'registration_ends_at_readonly', 
                'results_published_at_readonly', 'closes_at_readonly',
                'registration_status_readonly', 'sessions_status_readonly', 
                'results_status_readonly', 'current_stage_readonly', 
                'progress_percentage_readonly'
            ),
            'classes': ('collapse', 'wide'),
            'description': 'Информация о текущем состоянии события'
        }),
    )
    
    inlines = [
        EventParticipantInline, 
        OnlineEventInfoInline, 
        OfflineSessionsInfoInline,
        EventFileInline
    ]
    
    actions = [
        'publish_selected', 'archive_selected', 'duplicate_selected',
        'extend_registration', 'publish_results', 
        'make_private_selected', 'make_public_selected'
    ]
    
    def save_model(self, request, obj, form, change):
        """Сохранение модели в админке"""
        if not obj.pk:  # Если объект новый
            if not obj.owner:  # Если владелец не указан
                obj.owner = request.user  # Устанавливаем текущего пользователя
        
        super().save_model(request, obj, form, change)
    
    @admin.display(description='Владелец')
    def owner_safe_link(self, obj):
        if not obj.owner:
            return "—"
        
        try:
            url = f'/admin/auth/user/{obj.owner.id}/change/'
            if hasattr(obj.owner, 'get_full_name') and obj.owner.get_full_name():
                display_name = obj.owner.get_full_name()
            elif hasattr(obj.owner, 'username'):
                display_name = obj.owner.username
            elif hasattr(obj.owner, 'email'):
                display_name = obj.owner.email
            else:
                display_name = str(obj.owner)
            
            return format_html('<a href="{}">{}</a>', url, display_name)
        except Exception:
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
    
    @admin.display(description='Тип')
    def is_private_display(self, obj):
        if obj.is_private:
            return format_html(
                '<span style="color: purple;" title="Приватное">🔒</span>'
            )
        return format_html(
            '<span style="color: green;" title="Публичное">🌐</span>'
        )
    
    @admin.display(description='Регистрация')
    def registration_status_display(self, obj):
        status = obj.registration_status
        if status['is_active']:
            return format_html(
                '<span style="color: green;" title="Идет регистрация">📝</span>'
            )
        elif status['is_ended']:
            return format_html(
                '<span style="color: orange;" title="Регистрация закрыта">⏹️</span>'
            )
        else:
            return format_html(
                '<span style="color: gray;" title="Не началась">⏸️</span>'
            )
    
    @admin.display(description='Результаты')
    def results_status_display(self, obj):
        status = obj.results_status
        if status['is_published']:
            return format_html(
                '<span style="color: green;" title="Опубликованы">🏆</span>'
            )
        elif status['status'] == 'in_preparation':
            return format_html(
                '<span style="color: blue;" title="В подготовке">📊</span>'
            )
        else:
            return format_html(
                '<span style="color: gray;" title="Не готовы">📋</span>'
            )
    
    @admin.display(description='Этап')
    def current_stage_display(self, obj):
        stage = obj.current_stage
        icons = {
            'registration': '📝',
            'sessions': '🎤',
            'results': '🏆',
            'preparation': '🛠️',
            'not_started': '⏸️',
            'unknown': '❓'
        }
        icon = icons.get(stage['name'], '📋')
        
        if stage['status'] == 'active':
            return format_html(
                '<span style="color: green;" title="Активный этап: {}">{}</span>',
                stage['display'], icon
            )
        elif stage['status'] == 'completed':
            return format_html(
                '<span style="color: gray;" title="Завершен: {}">{}</span>',
                stage['display'], icon
            )
        else:
            return format_html(
                '<span style="color: blue;" title="{}">{}</span>',
                stage['display'], icon
            )
    
    @admin.display(description='Прогресс')
    def progress_bar(self, obj):
        progress = obj.progress_percentage
        color = 'green' if progress >= 66 else 'orange' if progress >= 33 else 'blue'
        html_template = (
            '<div style="width: 50px; background: #e0e0e0; border-radius: 3px; overflow: hidden;" title="{}%">'
            '<div style="width: {}%; height: 6px; background: {};"></div>'
            '</div>'
        )
        return format_html(html_template, progress, progress, color)
    
    @admin.display(description='Участники')
    def participant_count(self, obj):
        try:
            count = obj.event_participants.count()
            url = f'/admin/events/eventparticipant/?event__id={obj.id}'
            return format_html(
                '<a href="{}" title="Участники">{}</a>',
                url,
                count
            )
        except Exception:
            return "0"
    
    @admin.display(description='Онлайн')
    def online_sessions_count(self, obj):
        try:
            count = obj.online_sessions.count()
            if count > 0:
                url = f'/admin/events/onlineeventinfo/?event__id={obj.id}'
                return format_html(
                    '<a href="{}" title="Онлайн-сессии">{}</a>',
                    url,
                    count
                )
            return format_html('<span style="color: gray;">{}</span>', count)
        except Exception:
            return "0"
    
    @admin.display(description='Оффлайн')
    def offline_sessions_count(self, obj):
        try:
            count = obj.offline_sessions.count()
            if count > 0:
                url = f'/admin/events/offlinesessionsinfo/?event__id={obj.id}'
                return format_html(
                    '<a href="{}" title="Оффлайн-сессии">{}</a>',
                    url,
                    count
                )
            return format_html('<span style="color: gray;">{}</span>', count)
        except Exception:
            return "0"
    
    @admin.display(description='Файлы')
    def files_count(self, obj):
        try:
            count = obj.event_files.count()
            if count > 0:
                url = f'/admin/events/eventfile/?event__id={obj.id}'
                return format_html(
                    '<a href="{}" title="Файлы события" style="color: orange;">{}</a>',
                    url,
                    count
                )
            return format_html('<span style="color: gray;">{}</span>', count)
        except Exception:
            return "0"
    
    @admin.display(description='Создано', ordering='created_at')
    def created_at_display(self, obj):
        return obj.created_at.strftime('%d.%m.%Y') if obj.created_at else "—"
    
    # Действия
    @admin.action(description='Опубликовать выбранные события')
    def publish_selected(self, request, queryset):
        updated = queryset.update(status='published')
        self.message_user(request, f'Опубликовано {updated} событий')
    
    @admin.action(description='Архивировать выбранные события')
    def archive_selected(self, request, queryset):
        updated = queryset.update(status='completed', is_active=False)
        self.message_user(request, f'Заархивировано {updated} событий')
    
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
        self.message_user(request, f'Дублировано {duplicated} событий')
    
    @admin.action(description='Продлить регистрацию на 7 дней')
    def extend_registration(self, request, queryset):
        now = timezone.now()
        updated_count = 0
        for event in queryset:
            if event.status == 'published' and event.is_active:
                if event.registration_ends_at:
                    event.registration_ends_at = event.registration_ends_at + timezone.timedelta(days=7)
                else:
                    event.registration_ends_at = now + timezone.timedelta(days=7)
                event.save()
                updated_count += 1
        self.message_user(request, f'Регистрация продлена для {updated_count} событий')
    
    @admin.action(description='Опубликовать результаты сейчас')
    def publish_results(self, request, queryset):
        now = timezone.now()
        updated_count = 0
        for event in queryset:
            if event.status == 'published' and event.is_active:
                event.results_published_at = now
                event.save()
                updated_count += 1
        self.message_user(request, f'Результаты опубликованы для {updated_count} событий')
    
    @admin.action(description='Сделать приватными')
    def make_private_selected(self, request, queryset):
        updated = queryset.update(is_private=True)
        self.message_user(request, f'{updated} событий стали приватными')
    
    @admin.action(description='Сделать публичными')
    def make_public_selected(self, request, queryset):
        updated = queryset.update(is_private=False)
        self.message_user(request, f'{updated} событий стали публичными')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.select_related('owner')
        qs = qs.prefetch_related('event_participants', 'online_sessions', 'offline_sessions', 'event_files')
        return qs


@admin.register(EventFile)
class EventFileAdmin(admin.ModelAdmin):
    """Админ-класс для файлов событий"""
    list_display = [
        'event_safe_link', 'storage_file_link', 'category_display',
        'file_size_display', 'is_public_display', 'uploaded_by_safe_link',
        'uploaded_at_display'
    ]
    
    list_filter = [
        EventFileCategoryFilter, 'is_public', 'uploaded_at', 'event'
    ]
    
    search_fields = [
        'event__name', 'storage_file__name', 'storage_file__original_name',
        'description', 'uploaded_by__username', 'uploaded_by__email'
    ]
    
    list_select_related = ['event', 'storage_file', 'uploaded_by']
    
    date_hierarchy = 'uploaded_at'
    
    readonly_fields = ['uploaded_at', 'file_url_display', 'file_size_display_readonly']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('event', 'storage_file')
        }),
        ('Детали файла', {
            'fields': ('category', 'description', 'display_order')
        }),
        ('Доступ', {
            'fields': ('is_public', 'uploaded_by', 'uploaded_at')
        }),
        ('Информация о файле', {
            'fields': ('file_url_display', 'file_size_display_readonly'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['make_public_selected', 'make_private_selected']
    
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
    
    @admin.display(description='Файл', ordering='storage_file__name')
    def storage_file_link(self, obj):
        if not obj.storage_file:
            return "—"
        
        try:
            url = f'/admin/files/storagefile/{obj.storage_file.id}/change/'
            return format_html(
                '<a href="{}">{}</a>',
                url,
                obj.storage_file.name[:50]
            )
        except Exception:
            return obj.storage_file.name[:50] if obj.storage_file else "—"
    
    @admin.display(description='Категория')
    def category_display(self, obj):
        icons = {
            'agenda': '📋',
            'presentation': '📊',
            'document': '📄',
            'photo': '🖼️',
            'video': '🎬',
            'audio': '🎵',
            'result': '🏆',
            'other': '📁',
        }
        icon = icons.get(obj.category, '📁')
        return f"{icon} {obj.get_category_display()}"
    
    @admin.display(description='Размер')
    def file_size_display(self, obj):
        if obj.storage_file and hasattr(obj.storage_file, 'file_size_display'):
            return obj.storage_file.file_size_display
        return "—"
    
    @admin.display(description='Публичный')
    def is_public_display(self, obj):
        if obj.is_public:
            return format_html('<span style="color: green;">✓</span>')
        return format_html('<span style="color: red;">✗</span>')
    
    @admin.display(description='Загрузил', ordering='uploaded_by__username')
    def uploaded_by_safe_link(self, obj):
        if not obj.uploaded_by:
            return "—"
        
        try:
            url = f'/admin/auth/user/{obj.uploaded_by.id}/change/'
            if hasattr(obj.uploaded_by, 'username'):
                display_name = obj.uploaded_by.username
            elif hasattr(obj.uploaded_by, 'email'):
                display_name = obj.uploaded_by.email
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
    
    @admin.display(description='URL файла')
    def file_url_display(self, obj):
        if hasattr(obj, 'file_url') and obj.file_url:
            return format_html(
                '<a href="{}" target="_blank">🔗 Открыть файл</a>',
                obj.file_url
            )
        return "—"
    
    @admin.display(description='Размер файла')
    def file_size_display_readonly(self, obj):
        if hasattr(obj, 'file_size') and obj.file_size:
            if obj.storage_file and hasattr(obj.storage_file, 'file_size_display'):
                return format_html(
                    '<span style="color: #666;">{}</span>',
                    obj.storage_file.file_size_display
                )
        return "—"
    
    # Действия
    @admin.action(description='Сделать публичными')
    def make_public_selected(self, request, queryset):
        updated = queryset.update(is_public=True)
        self.message_user(request, f'{updated} файлов стали публичными')
    
    @admin.action(description='Сделать приватными')
    def make_private_selected(self, request, queryset):
        updated = queryset.update(is_public=False)
        self.message_user(request, f'{updated} файлов стали приватными')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.select_related('event', 'storage_file', 'uploaded_by')
        return qs


@admin.register(OnlineEventInfo)
class OnlineEventInfoAdmin(admin.ModelAdmin):
    """Админ-класс для онлайн-сессий"""
    list_display = [
        'session_name', 'event_safe_link', 'start_time_display',
        'end_time_display', 'duration_display', 'status_display',
        'is_ongoing_display', 'platform_display', 'participant_count',
        'is_active_display'
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
    
    # Методы для readonly_fields (detail view)
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
    
    @admin.display(description='Участников')
    def participant_count(self, obj):
        try:
            count = obj.attendances.count()
            if count > 0:
                url = f'/admin/events/sessionattendance/?session__id={obj.id}'
                return format_html(
                    '<a href="{}">{}</a>',
                    url,
                    count
                )
            return count
        except Exception:
            return "0"
    
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


@admin.register(OfflineSessionsInfo)
class OfflineSessionsInfoAdmin(admin.ModelAdmin):
    """Админ-класс для оффлайн-сессий"""
    list_display = [
        'session_name', 'event_safe_link', 'start_time_display',
        'end_time_display', 'duration_display', 'status_display',
        'is_ongoing_display', 'full_location_display', 'is_active_display'
    ]
    
    list_filter = [
        'status', 'is_active', IsOngoingFilter,
        'start_time', 'event'
    ]
    
    search_fields = [
        'session_name', 'session_notes', 'event__name',
        'address', 'room', 'event__owner__username'
    ]
    
    list_select_related = ['event', 'event__owner']
    
    date_hierarchy = 'start_time'
    
    # Методы для readonly_fields (detail view)
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
        ('Местоположение', {
            'fields': ('address', 'room')
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
    
    actions = ['start_selected', 'complete_selected', 'cancel_selected']
    
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
    
    @admin.display(description='Место проведения')
    def full_location_display(self, obj):
        if hasattr(obj, 'full_location') and obj.full_location:
            location = obj.full_location
            return format_html(
                '<span style="color: #555;">📍 {}</span>',
                location[:50] + '...' if len(location) > 50 else location
            )
        return '—'
    
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
    
    @admin.display(description='Участник', ordering='user__username')
    def user_safe_link(self, obj):
        if not obj.user:
            return "—"
        
        try:
            url = f'/admin/auth/user/{obj.user.id}/change/'
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
            'owner': 'orange',
            'referee': 'purple',
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