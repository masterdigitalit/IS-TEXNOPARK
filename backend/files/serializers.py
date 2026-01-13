# files/serializers.py
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


class FileUploadSerializer(serializers.Serializer):
    """Сериализатор для загрузки файлов"""
    file = serializers.FileField(required=True)
    name = serializers.CharField(required=False, allow_blank=True)
    category = serializers.ChoiceField(choices=FileCategory.choices, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    is_public = serializers.BooleanField(default=True)
    event_id = serializers.IntegerField(required=False, allow_null=True)
    event_category = serializers.ChoiceField(
        choices=[
            ('agenda', 'Повестка дня'),
            ('presentation', 'Презентация'),
            ('document', 'Документ'),
            ('photo', 'Фотография'),
            ('video', 'Видеозапись'),
            ('audio', 'Аудиозапись'),
            ('result', 'Результаты'),
            ('other', 'Другое'),
        ],
        required=False,
        default='document'
    )
    event_description = serializers.CharField(required=False, allow_blank=True)
    
    def validate_file(self, value):
        """Валидация файла"""
        max_size = 100 * 1024 * 1024  # 100MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"Файл слишком большой. Максимальный размер: {max_size // (1024*1024)}MB"
            )
        return value
    
    def create(self, validated_data):
        request = self.context.get('request')
        file_obj = validated_data['file']
        event_id = validated_data.pop('event_id', None)
        event_category = validated_data.pop('event_category', 'document')
        event_description = validated_data.pop('event_description', '')
        
        # Создаем файл
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
        
        # Если передан event_id, создаем связь через EventFile
        if event_id and request and request.user:
            try:
                # Импортируем здесь чтобы избежать циклического импорта
                from events.models import Event, EventFile, EventParticipant
                event = Event.objects.get(id=event_id)
                
                # Проверяем, что пользователь имеет доступ к событию
                if event.owner == request.user or \
                   EventParticipant.objects.filter(event=event, user=request.user, is_confirmed=True).exists():
                    
                    # Создаем связь файла с событием
                    EventFile.objects.create(
                        event=event,
                        storage_file=storage_file,
                        category=event_category,
                        description=event_description,
                        is_public=validated_data.get('is_public', True),
                        uploaded_by=request.user
                    )
            except (Event.DoesNotExist, ImportError) as e:
                # Если событие не найдено или не можем импортировать, просто создаем файл
                print(f"Не удалось привязать файл к событию: {e}")
        
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
    event_id = serializers.IntegerField(required=False)
    
    def validate(self, data):
        """Валидация дат"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'start_date': 'Дата начала должна быть раньше даты окончания'
            })
        
        return data


# Сериализатор для EventFile (для отображения связи файлов с событиями)
class EventFileSerializer(serializers.ModelSerializer):
    """Сериализатор для связи файлов с событиями"""
    file = StorageFileSerializer(source='storage_file', read_only=True)
    file_name = serializers.CharField(source='storage_file.name', read_only=True)
    file_url = serializers.CharField(source='storage_file.file_url', read_only=True)
    file_size = serializers.IntegerField(source='storage_file.file_size', read_only=True)
    file_size_display = serializers.CharField(source='storage_file.file_size_display', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    
    class Meta:
        model = None  # Будет установлен динамически
        fields = [
            'id', 'event', 'category', 'description', 'is_public',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at',
            'file', 'file_name', 'file_url', 'file_size', 'file_size_display'
        ]
        read_only_fields = ['uploaded_by', 'uploaded_at']
    
    def __init__(self, *args, **kwargs):
        # Динамически импортируем модель чтобы избежать циклического импорта
        from events.models import EventFile
        self.Meta.model = EventFile
        super().__init__(*args, **kwargs)