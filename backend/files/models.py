# files/models.py
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.core.validators import FileExtensionValidator


class FileCategory(models.TextChoices):
    """Категории файлов"""
    IMAGE = 'image', _('Изображение')
    DOCUMENT = 'document', _('Документ')
    VIDEO = 'video', _('Видео')
    AUDIO = 'audio', _('Аудио')
    ARCHIVE = 'archive', _('Архив')
    OTHER = 'other', _('Другое')


class StorageFile(models.Model):
    """Модель для хранения файлов в MinIO"""
    
    name = models.CharField(
        _('Название файла'),
        max_length=255,
        help_text=_('Человекочитаемое название файла')
    )
    
    original_name = models.CharField(
        _('Оригинальное имя'),
        max_length=255,
        help_text=_('Оригинальное имя файла при загрузке')
    )
    
    file = models.FileField(
        _('Файл'),
        upload_to='uploads/%Y/%m/%d/',
        validators=[
            FileExtensionValidator([
                'jpg', 'jpeg', 'png', 'gif',  # Изображения
                'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',  # Документы
                'mp4', 'avi', 'mov', 'mkv',  # Видео
                'mp3', 'wav', 'ogg',  # Аудио
                'zip', 'rar', '7z',  # Архивы
                'txt', 'csv', 'json', 'xml'  # Текстовые
            ])
        ]
    )
    
    category = models.CharField(
        _('Категория'),
        max_length=20,
        choices=FileCategory.choices,
        default=FileCategory.OTHER
    )
    
    file_size = models.PositiveBigIntegerField(
        _('Размер файла (байт)'),
        default=0
    )
    
    mime_type = models.CharField(
        _('MIME тип'),
        max_length=100,
        blank=True
    )
    
    description = models.TextField(
        _('Описание'),
        blank=True,
        null=True
    )
    
    is_public = models.BooleanField(
        _('Публичный доступ'),
        default=True,
        help_text=_('Доступен ли файл для публичного просмотра')
    )
    
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_files',
        verbose_name=_('Загрузил')
    )
    
    created_at = models.DateTimeField(
        _('Дата загрузки'),
        auto_now_add=True
    )
    
    updated_at = models.DateTimeField(
        _('Дата обновления'),
        auto_now=True
    )
    
    class Meta:
        verbose_name = _('Файл в хранилище')
        verbose_name_plural = _('Файлы в хранилище')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['is_public']),
            models.Index(fields=['uploaded_by']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_file_size_display()})"
    
    @property
    def file_url(self):
        """Получить URL файла"""
        if self.file:
            return self.file.url
        return None
    
    @property
    def file_size_display(self):
        """Человекочитаемый размер файла"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.2f} {unit}"
            size /= 1024.0
        return f"{size:.2f} TB"
    
    def save(self, *args, **kwargs):
        """Переопределение save для вычисления размера и MIME типа"""
        if self.file and not self.file_size:
            self.file_size = self.file.size
        
        if self.file and not self.mime_type:
            import mimetypes
            mime_type, _ = mimetypes.guess_type(self.original_name or self.name)
            self.mime_type = mime_type or 'application/octet-stream'
        
        if not self.original_name and self.file:
            self.original_name = self.file.name
        
        super().save(*args, **kwargs)


class FileShareLink(models.Model):
    """Ссылка для временного доступа к файлу"""
    
    file = models.ForeignKey(
        StorageFile,
        on_delete=models.CASCADE,
        related_name='share_links',
        verbose_name=_('Файл')
    )
    
    token = models.CharField(
        _('Токен доступа'),
        max_length=100,
        unique=True
    )
    
    expires_at = models.DateTimeField(
        _('Действителен до'),
        null=True,
        blank=True,
        help_text=_('Если не указано, ссылка бессрочная')
    )
    
    max_downloads = models.PositiveIntegerField(
        _('Максимум скачиваний'),
        default=0,
        help_text=_('0 = без ограничений')
    )
    
    download_count = models.PositiveIntegerField(
        _('Скачано раз'),
        default=0
    )
    
    is_active = models.BooleanField(
        _('Активна'),
        default=True
    )
    
    created_at = models.DateTimeField(
        _('Дата создания'),
        auto_now_add=True
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_share_links',
        verbose_name=_('Создал')
    )
    
    class Meta:
        verbose_name = _('Ссылка для доступа')
        verbose_name_plural = _('Ссылки для доступа')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Ссылка для {self.file.name}"
    
    @property
    def is_expired(self):
        """Проверка истечения срока действия"""
        from django.utils import timezone
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    @property
    def is_valid(self):
        """Проверка валидности ссылки"""
        return self.is_active and not self.is_expired and (
            self.max_downloads == 0 or self.download_count < self.max_downloads
        )
