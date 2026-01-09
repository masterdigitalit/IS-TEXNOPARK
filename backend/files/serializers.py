
from rest_framework import serializers
from django.utils import timezone
from django.core.files.storage import default_storage
from .models import StorageFile, FileShareLink, FileCategory
import uuid


class StorageFileSerializer(serializers.ModelSerializer):
    """Сериализатор для файлов"""
    file_url = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    uploaded_by_email = serializers.CharField(source='uploaded_by.email', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = StorageFile
        fields = [
            'id', 'name', 'original_name', 'file', 'file_url',
            'category', 'category_display', 'file_size', 'file_size_display',
            'mime_type', 'description', 'is_public', 'uploaded_by',
            'uploaded_by_name', 'uploaded_by_email', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'file_size', 'mime_type', 'original_name',
            'uploaded_by', 'created_at', 'updated_at',
            'file_url', 'file_size_display'
        ]
    
    def get_file_url(self, obj):
        """Получить URL файла"""
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None
    
    def get_file_size_display(self, obj):
        """Получить читаемый размер файла"""
        return obj.file_size_display
    
    def validate_file(self, value):
        """Валидация файла"""
        # Проверка размера (10MB максимум)
        max_size = 10 * 1024 * 1024  # 10MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"Файл слишком большой. Максимальный размер: {max_size // (1024*1024)}MB"
            )
        return value
    
    def create(self, validated_data):
        """Создание файла с автоматическим определением категории"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['uploaded_by'] = request.user
        
        # Определяем категорию по расширению
        file = validated_data.get('file')
        if file and not validated_data.get('category'):
            ext = file.name.split('.')[-1].lower() if '.' in file.name else ''
            if ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']:
                validated_data['category'] = FileCategory.IMAGE
            elif ext in ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']:
                validated_data['category'] = FileCategory.DOCUMENT
            elif ext in ['mp4', 'avi', 'mov', 'mkv', 'webm']:
                validated_data['category'] = FileCategory.VIDEO
            elif ext in ['mp3', 'wav', 'ogg', 'flac']:
                validated_data['category'] = FileCategory.AUDIO
            elif ext in ['zip', 'rar', '7z', 'tar', 'gz']:
                validated_data['category'] = FileCategory.ARCHIVE
        
        return super().create(validated_data)


class FileUploadSerializer(serializers.Serializer):
    """Сериализатор для загрузки файлов"""
    file = serializers.FileField(required=True)
    name = serializers.CharField(required=False, allow_blank=True)
    category = serializers.ChoiceField(choices=FileCategory.choices, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    is_public = serializers.BooleanField(default=True)
    
    def create(self, validated_data):
        request = self.context.get('request')
        file_obj = validated_data['file']
        
        storage_file = StorageFile.objects.create(
            name=validated_data.get('name') or file_obj.name,
            original_name=file_obj.name,
            file=file_obj,
            category=validated_data.get('category', FileCategory.OTHER),
            description=validated_data.get('description', ''),
            is_public=validated_data.get('is_public', True),
            uploaded_by=request.user if request else None,
            file_size=file_obj.size
        )
        
        return storage_file


class FileShareLinkSerializer(serializers.ModelSerializer):
    """Сериализатор для ссылок доступа"""
    file_name = serializers.CharField(source='file.name', read_only=True)
    file_size = serializers.IntegerField(source='file.file_size', read_only=True)
    share_url = serializers.SerializerMethodField()
    is_valid = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = FileShareLink
        fields = [
            'id', 'token', 'file', 'file_name', 'file_size',
            'expires_at', 'max_downloads', 'download_count',
            'is_active', 'is_valid', 'is_expired', 'share_url',
            'created_at', 'created_by'
        ]
        read_only_fields = [
            'token', 'download_count', 'is_valid', 'is_expired',
            'share_url', 'created_at', 'created_by'
        ]
    
    def get_share_url(self, obj):
        """Получить полный URL для скачивания"""
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/api/files/share/{obj.token}/')
        return None
    
    def create(self, validated_data):
        """Создание ссылки с уникальным токеном"""
        request = self.context.get('request')
        if request:
            validated_data['created_by'] = request.user
        
        validated_data['token'] = uuid.uuid4().hex
        
        return super().create(validated_data)


class FileSearchSerializer(serializers.Serializer):
    """Сериализатор для поиска файлов"""
    query = serializers.CharField(required=False)
    category = serializers.ChoiceField(choices=FileCategory.choices, required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    uploaded_by = serializers.IntegerField(required=False)
    is_public = serializers.BooleanField(required=False)
    
    def validate(self, data):
        """Валидация дат"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'start_date': 'Дата начала должна быть раньше даты окончания'
            })
        
        return data