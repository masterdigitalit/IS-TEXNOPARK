# user/admin.py или notifications/admin.py (в зависимости от структуры)
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Админ-панель для управления уведомлениями
    """
    # Список отображаемых полей в таблице
    list_display = [
        'id',
        'user_email',
        'title_short',
        'is_read_badge',
        'created_at_formatted',
        'read_at_formatted',
        'time_since_created',
    ]
    
    # Поля для фильтрации
    list_filter = [
        'is_read',
        'created_at',
        'user',
    ]
    
    # Поля для поиска
    search_fields = [
        'title',
        'text',
        'user__email',
        'user__first_name',
        'user__last_name',
    ]
    
    # Сортировка по умолчанию
    ordering = ['-created_at']
    
    # Автополные поля
    autocomplete_fields = ['user']
    
    # Фильтр по дате создания
    date_hierarchy = 'created_at'
    
    # Поля только для чтения
    readonly_fields = [
        'created_at',
        'read_at',
        'time_since_created',
        'time_since_read',
    ]
    
    # Разделение полей в форме редактирования
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'title', 'text')
        }),
        ('Статус', {
            'fields': ('is_read', 'read_at')
        }),
        ('Системная информация', {
            'fields': ('created_at', 'time_since_created', 'time_since_read'),
            'classes': ('collapse',)
        }),
    )
    
    # Действия в админке
    actions = [
        'mark_as_read',
        'mark_as_unread',
        'delete_all_read',
    ]
    
    # Кастомные методы для отображения
    
    def user_email(self, obj):
        """Отображаем email пользователя"""
        return obj.user.email
    user_email.short_description = 'Пользователь'
    user_email.admin_order_field = 'user__email'
    
    def title_short(self, obj):
        """Сокращенный заголовок (первые 50 символов)"""
        if len(obj.title) > 50:
            return f"{obj.title[:47]}..."
        return obj.title
    title_short.short_description = 'Заголовок'
    
    def is_read_badge(self, obj):
        """Красивая иконка статуса прочтения"""
        if obj.is_read:
            return format_html(
                '<span style="color: green;">✓ Прочитано</span>'
            )
        else:
            return format_html(
                '<span style="color: red; font-weight: bold;">✗ Не прочитано</span>'
            )
    is_read_badge.short_description = 'Статус'
    is_read_badge.admin_order_field = 'is_read'
    
    def created_at_formatted(self, obj):
        """Форматированная дата создания"""
        return obj.created_at.strftime('%d.%m.%Y %H:%M')
    created_at_formatted.short_description = 'Создано'
    created_at_formatted.admin_order_field = 'created_at'
    
    def read_at_formatted(self, obj):
        """Форматированная дата прочтения"""
        if obj.read_at:
            return obj.read_at.strftime('%d.%m.%Y %H:%M')
        return '-'
    read_at_formatted.short_description = 'Прочитано'
    read_at_formatted.admin_order_field = 'read_at'
    
    def time_since_created(self, obj):
        """Время с момента создания"""
        if obj.created_at:
            delta = timezone.now() - obj.created_at
            if delta.days > 0:
                return f"{delta.days} д. назад"
            elif delta.seconds // 3600 > 0:
                return f"{delta.seconds // 3600} ч. назад"
            elif delta.seconds // 60 > 0:
                return f"{delta.seconds // 60} мин. назад"
            else:
                return "только что"
        return '-'
    time_since_created.short_description = 'Создано назад'
    
    def time_since_read(self, obj):
        """Время с момента прочтения"""
        if obj.read_at:
            delta = timezone.now() - obj.read_at
            if delta.days > 0:
                return f"{delta.days} д. назад"
            elif delta.seconds // 3600 > 0:
                return f"{delta.seconds // 3600} ч. назад"
            elif delta.seconds // 60 > 0:
                return f"{delta.seconds // 60} мин. назад"
            else:
                return "только что"
        return '-'
    time_since_read.short_description = 'Прочитано назад'
    
    # Кастомные действия
    
    def mark_as_read(self, request, queryset):
        """Пометить выбранные уведомления как прочитанные"""
        updated = queryset.filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        self.message_user(
            request, 
            f"{updated} уведомлений помечено как прочитанные"
        )
    mark_as_read.short_description = "Пометить как прочитанные"
    
    def mark_as_unread(self, request, queryset):
        """Пометить выбранные уведомления как непрочитанные"""
        updated = queryset.filter(is_read=True).update(
            is_read=False,
            read_at=None
        )
        self.message_user(
            request, 
            f"{updated} уведомлений помечено как непрочитанные"
        )
    mark_as_unread.short_description = "Пометить как непрочитанные"
    
    def delete_all_read(self, request, queryset):
        """Удалить все прочитанные уведомления"""
        deleted, _ = queryset.filter(is_read=True).delete()
        self.message_user(
            request, 
            f"{deleted} прочитанных уведомлений удалено"
        )
    delete_all_read.short_description = "Удалить прочитанные"
    
    # Кастомные вьюшки для статистики
    def changelist_view(self, request, extra_context=None):
        """Добавляем статистику в список уведомлений"""
        extra_context = extra_context or {}
        
        # Статистика по уведомлениям
        total = Notification.objects.count()
        unread = Notification.objects.filter(is_read=False).count()
        read = total - unread
        
        # Уведомления за последние 7 дней
        week_ago = timezone.now() - timezone.timedelta(days=7)
        recent = Notification.objects.filter(created_at__gte=week_ago).count()
        
        extra_context['stats'] = {
            'total': total,
            'unread': unread,
            'read': read,
            'recent': recent,
        }
        
        return super().changelist_view(request, extra_context=extra_context)