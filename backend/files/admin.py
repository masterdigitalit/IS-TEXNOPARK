
from django.contrib import admin
from django.utils.html import format_html
from .models import StorageFile, FileShareLink


@admin.register(StorageFile)
class StorageFileAdmin(admin.ModelAdmin):
    list_display = ['name', 'category_display', 'file_size_display', 
                   'uploaded_by', 'is_public', 'created_at']
    list_filter = ['category', 'is_public', 'created_at', 'uploaded_by']
    search_fields = ['name', 'original_name', 'description']
    readonly_fields = ['file_size', 'mime_type', 'original_name', 'created_at']
    
    def category_display(self, obj):
        return obj.get_category_display()
    category_display.short_description = 'Категория'
    
    def file_size_display(self, obj):
        return obj.file_size_display
    file_size_display.short_description = 'Размер'


@admin.register(FileShareLink)
class FileShareLinkAdmin(admin.ModelAdmin):
    list_display = ['file', 'token', 'is_valid', 'expires_at', 
                   'download_count', 'created_by', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['file__name', 'token']
    readonly_fields = ['token', 'download_count', 'created_at']
    
    def is_valid(self, obj):
        if obj.is_valid:
            return format_html('<span style="color: green;">✓ Да</span>')
        return format_html('<span style="color: red;">✗ Нет</span>')
    is_valid.short_description = 'Валидна'

