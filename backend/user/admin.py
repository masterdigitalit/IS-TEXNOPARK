from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from django import forms
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from .models import User


class CustomUserCreationForm(UserCreationForm):
    """Кастомная форма для создания пользователя"""
    
    class Meta:
        model = User
        fields = (
            'email', 'first_name', 'middle_name', 'last_name',
            'phone', 'avatar_url', 'role', 'is_active', 'is_verified'
        )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'].required = True
        self.fields['password1'].required = True
        self.fields['password2'].required = True


class CustomUserChangeForm(UserChangeForm):
    """Кастомная форма для изменения пользователя"""
    
    class Meta:
        model = User
        fields = '__all__'


class CustomUserAdmin(UserAdmin):
    """Кастомная админка для модели User"""
    
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm
    
    # Поля для отображения в списке
    list_display = (
        'email', 'get_full_name_display', 'role_display', 
        'phone', 'is_active', 'is_staff', 'is_superuser',
        'is_verified', 'created_at_short', 'last_login_short'
    )
    
    # Поля для фильтрации
    list_filter = (
        'role', 'is_active', 'is_staff', 'is_superuser', 
        'is_verified', 'created_at', 'last_login'
    )
    
    # Горизонтальные фильтры для групп и прав
    filter_horizontal = ('groups', 'user_permissions')
    
    # Поля для поиска
    search_fields = (
        'email', 'first_name', 'middle_name', 'last_name', 
        'phone'
    )
    
    # Порядок сортировки
    ordering = ('-created_at', 'email')
    
    # Поля только для чтения
    readonly_fields = (
        'created_at', 'last_login', 'date_joined',
        'password_view', 'avatar_display'  # Изменено: avatar_display вместо avatar_url_display
    )
    
    # Группировка полей в форме редактирования - ИСПРАВЛЕНО
    fieldsets = (
        (None, {
            'fields': (
                'email', 'password_view',
                'first_name', 'middle_name', 'last_name',
                'avatar_display', 'avatar_url'  # Добавлено avatar_url как редактируемое поле
            )
        }),
        (_('Контактная информация'), {
            'fields': ('phone',)
        }),
        (_('Роли и права'), {
            'fields': (
                'role', 'is_active', 'is_staff', 'is_superuser',
                'is_verified', 'groups', 'user_permissions'
            )
        }),
        (_('Важные даты'), {
            'fields': (
                'created_at', 'last_login', 'date_joined'
            )
        }),
    )
    
    # Поля для формы создания пользователя
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'password1', 'password2',
                'first_name', 'middle_name', 'last_name',
                'phone', 'avatar_url', 'role', 
                'is_active', 'is_staff', 'is_superuser', 
                'is_verified'
            ),
        }),
    )
    
    # Дополнительные методы для отображения
    
    def get_full_name_display(self, obj):
        """Отображение полного имени в списке"""
        full_name = obj.get_full_name()
        if full_name:
            return full_name
        return '-'
    get_full_name_display.short_description = _('ФИО')
    get_full_name_display.admin_order_field = 'last_name'
    
    def role_display(self, obj):
        """Отображение роли с цветом"""
        role_colors = {
            'admin': 'red',
            'teacher': 'green',
            'student': 'blue',
            'referee': 'orange',
            'user': 'gray',
        }
        color = role_colors.get(obj.role, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_role_display()
        )
    role_display.short_description = _('Роль')
    
    def created_at_short(self, obj):
        """Короткий формат даты создания"""
        if obj.created_at:
            return obj.created_at.strftime('%d.%m.%Y')
        return '-'
    created_at_short.short_description = _('Создан')
    created_at_short.admin_order_field = 'created_at'
    
    def last_login_short(self, obj):
        """Короткий формат даты последнего входа"""
        if obj.last_login:
            return obj.last_login.strftime('%d.%m.%Y %H:%M')
        return '-'
    last_login_short.short_description = _('Последний вход')
    last_login_short.admin_order_field = 'last_login'
    
    # Метод для отображения аватара - ИСПРАВЛЕНО
    def avatar_display(self, obj):
        """Отображение аватара в админке"""
        if obj.avatar_url:
            return format_html(
                '<div style="margin-bottom: 10px;">'
                '<img src="{}" style="max-width: 100px; max-height: 100px; border-radius: 50%; border: 2px solid #ddd;" />'
                '<br><small>Текущий аватар</small>'
                '</div>',
                obj.avatar_url
            )
        return _('Нет аватара')
    avatar_display.short_description = _('Текущий аватар')
    
    def password_view(self, obj):
        """Показ что пароль установлен"""
        if obj.pk:
            return _('******** (пароль установлен)')
        return _('Пароль не установлен')
    password_view.short_description = _('Пароль')
    
    # Действия администратора
    
    actions = [
        'make_active',
        'make_inactive',
        'verify_users',
        'make_staff',
        'remove_staff',
        'export_emails'
    ]
    
    def make_active(self, request, queryset):
        """Активировать выбранных пользователей"""
        updated = queryset.update(is_active=True)
        self.message_user(
            request, 
            _('Активировано {} пользователей').format(updated)
        )
    make_active.short_description = _('Активировать выбранных пользователей')
    
    def make_inactive(self, request, queryset):
        """Деактивировать выбранных пользователей"""
        updated = queryset.update(is_active=False)
        self.message_user(
            request, 
            _('Деактивировано {} пользователей').format(updated)
        )
    make_inactive.short_description = _('Деактивировать выбранных пользователей')
    
    def verify_users(self, request, queryset):
        """Подтвердить выбранных пользователей"""
        updated = queryset.update(is_verified=True)
        self.message_user(
            request, 
            _('Подтверждено {} пользователей').format(updated)
        )
    verify_users.short_description = _('Подтвердить выбранных пользователей')
    
    def make_staff(self, request, queryset):
        """Сделать выбранных пользователей персоналом"""
        updated = queryset.update(is_staff=True)
        self.message_user(
            request, 
            _('{} пользователей сделаны персоналом').format(updated)
        )
    make_staff.short_description = _('Сделать персоналом')
    
    def remove_staff(self, request, queryset):
        """Убрать из персонала"""
        # Не даем убрать is_staff у суперпользователей
        non_superusers = queryset.filter(is_superuser=False)
        updated = non_superusers.update(is_staff=False)
        self.message_user(
            request, 
            _('{} пользователей убраны из персонала').format(updated)
        )
    remove_staff.short_description = _('Убрать из персонала')
    
    def export_emails(self, request, queryset):
        """Экспорт email выбранных пользователей"""
        from django.http import HttpResponse
        emails = list(queryset.values_list('email', flat=True))
        response = HttpResponse(
            '\n'.join(emails), 
            content_type='text/plain'
        )
        response['Content-Disposition'] = 'attachment; filename="users_emails.txt"'
        return response
    export_emails.short_description = _('Экспортировать emails в текстовый файл')


# Фильтр для ролей в админке
class RoleFilter(admin.SimpleListFilter):
    """Фильтр по ролям пользователей"""
    title = _('Роль')
    parameter_name = 'role'
    
    def lookups(self, request, model_admin):
        return User.ROLE_CHOICES
    
    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(role=self.value())
        return queryset


# Регистрация модели
admin.site.register(User, CustomUserAdmin)