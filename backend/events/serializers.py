# events/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import (
    Event, EventParticipant, OnlineEventInfo, 
    SessionAttendance, SessionMaterial, OfflineSessionsInfo, EventFile  # ← ДОБАВЛЕНО: EventFile
)
from files.serializers import StorageFileSerializer  # ← ДОБАВЛЕНО: импорт сериализатора файлов

User = get_user_model()


# ====================
# Вспомогательные сериализаторы
# ====================

class UserSimpleSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для пользователя"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    avatar_url = serializers.CharField(read_only=True, allow_null=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'avatar_url']


# ====================
# Упрощенные сериализаторы для сессий (для списка событий)
# ====================

class OnlineSessionSimpleSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для онлайн-сессий (для списка событий)"""
    duration_minutes = serializers.IntegerField(read_only=True)
    is_ongoing = serializers.BooleanField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = OnlineEventInfo
        fields = [
            'id', 'session_name', 'start_time', 'end_time',
            'session_notes', 'link', 'status', 'platform', 'access_code',
            'max_participants', 'is_active', 'duration_minutes',
            'is_ongoing', 'is_upcoming', 'is_past'
        ]


class OfflineSessionSimpleSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для офлайн-сессий (для списка событий)"""
    duration_minutes = serializers.IntegerField(read_only=True)
    is_ongoing = serializers.BooleanField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    full_location = serializers.CharField(read_only=True)
    
    class Meta:
        model = OfflineSessionsInfo
        fields = [
            'id', 'session_name', 'start_time', 'end_time',
            'session_notes', 'address', 'room', 'status', 'max_participants',
            'is_active', 'duration_minutes', 'is_ongoing', 'is_upcoming',
            'is_past', 'full_location'
        ]


# ====================
# ДОБАВЛЕНО: Сериализаторы для файлов событий
# ====================

class EventFileSimpleSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для файлов событий (для списка)"""
    file_name = serializers.CharField(source='storage_file.name', read_only=True)
    file_size = serializers.IntegerField(source='storage_file.file_size', read_only=True)
    file_url = serializers.CharField(source='storage_file.file_url', read_only=True)
    file_size_display = serializers.CharField(source='storage_file.file_size_display', read_only=True)
    
    class Meta:
        model = EventFile
        fields = [
            'id', 'category', 'description', 'is_public',
            'file_name', 'file_size', 'file_size_display', 'file_url',
            'uploaded_at', 'display_order'
        ]
        read_only_fields = ['uploaded_at']


class EventFileSerializer(serializers.ModelSerializer):
    """Сериализатор для файлов событий с полной информацией"""
    storage_file_data = StorageFileSerializer(source='storage_file', read_only=True)
    uploaded_by = UserSimpleSerializer(read_only=True)
    uploaded_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='uploaded_by',
        write_only=True,
        required=False
    )
    event = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        write_only=True
    )
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = EventFile
        fields = [
            'id', 'event', 'storage_file', 'storage_file_data',
            'category', 'category_display', 'description', 'is_public',
            'uploaded_by', 'uploaded_by_id', 'uploaded_at', 'display_order'
        ]
        read_only_fields = ['uploaded_at', 'uploaded_by']
    
    def create(self, validated_data):
        """Создание связи файла с событием"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['uploaded_by'] = request.user
        
        return super().create(validated_data)


# ====================
# Основные сериализаторы
# ====================

class EventSerializer(serializers.ModelSerializer):
    """Сериализатор для Event"""
    owner = UserSimpleSerializer(read_only=True)
    owner_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='owner',
        write_only=True,
        required=False
    )
    is_open = serializers.BooleanField(read_only=True)
    has_online_sessions = serializers.BooleanField(read_only=True)
    has_offline_sessions = serializers.BooleanField(read_only=True)
    online_sessions_count = serializers.IntegerField(read_only=True)
    offline_sessions_count = serializers.IntegerField(read_only=True)
    participants_count = serializers.SerializerMethodField()
    files_count = serializers.IntegerField(source='files_count', read_only=True)  # ← ДОБАВЛЕНО
    is_private = serializers.BooleanField(default=False)
    
    # Краткая информация о сессиях
    upcoming_online_sessions = serializers.SerializerMethodField()
    upcoming_offline_sessions = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'owner', 'owner_id', 'name', 'description', 'status',
            'created_at', 'closes_at', 'image_url', 'updated_at', 'is_active',
            'is_open', 'has_online_sessions', 'has_offline_sessions',
            'online_sessions_count', 'offline_sessions_count', 'participants_count',
            'files_count',  # ← ДОБАВЛЕНО
            'upcoming_online_sessions', 'upcoming_offline_sessions', 'is_private'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'owner', 'is_open',
            'has_online_sessions', 'has_offline_sessions',
            'online_sessions_count', 'offline_sessions_count',
            'files_count'  # ← ДОБАВЛЕНО
        ]
    
    def get_participants_count(self, obj):
        """Получить количество участников события"""
        return obj.event_participants.filter(is_confirmed=True).count()
    
    def get_upcoming_online_sessions(self, obj):
        """Получить предстоящие онлайн сессии"""
        sessions = obj.online_sessions.filter(
            is_active=True,
            status='scheduled',
            start_time__gt=timezone.now()
        )[:3]
        return OnlineSessionSimpleSerializer(sessions, many=True).data
    
    def get_upcoming_offline_sessions(self, obj):
        """Получить предстоящие офлайн сессии"""
        sessions = obj.offline_sessions.filter(
            is_active=True,
            status='scheduled',
            start_time__gt=timezone.now()
        )[:3]
        return OfflineSessionSimpleSerializer(sessions, many=True).data
    
    def validate(self, data):
        """Валидация данных события"""
        closes_at = data.get('closes_at')
        if closes_at and closes_at <= serializers.DateTimeField().to_representation(
            serializers.DateTimeField().to_internal_value(data.get('created_at', serializers.DateTimeField().to_internal_value('now')))
        ):
            raise serializers.ValidationError({
                'closes_at': 'Дата закрытия должна быть в будущем'
            })
        return data
    
    def create(self, validated_data):
        """Создание события с автоматическим назначением владельца"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['owner'] = request.user
        # Теперь участника создаст метод save() модели Event
        return super().create(validated_data)


class EventParticipantSerializer(serializers.ModelSerializer):
    """Сериализатор для EventParticipant"""
    user = UserSimpleSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True
    )
    event = EventSerializer(read_only=True)
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        source='event',
        write_only=True
    )
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = EventParticipant
        fields = [
            'id', 'event', 'event_id', 'user', 'user_id', 
            'user_email', 'user_name', 'event_name',
            'registered_at', 'role', 'role_display', 'is_confirmed'
        ]
        read_only_fields = ['registered_at', 'role_display']
    
    def validate(self, data):
        """Валидация данных участника"""
        event = data.get('event')
        user = data.get('user')
        
        if self.instance is None:
            if EventParticipant.objects.filter(event=event, user=user).exists():
                raise serializers.ValidationError({
                    'user': 'Этот пользователь уже участвует в данном событии'
                })
        
        if event and not event.is_active:
            raise serializers.ValidationError({
                'event': 'Событие не активно'
            })
        
        return data


class OnlineEventInfoSerializer(serializers.ModelSerializer):
    """Сериализатор для OnlineEventInfo"""
    event = EventSerializer(read_only=True)
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        source='event',
        write_only=True
    )
    duration_minutes = serializers.IntegerField(read_only=True)
    is_ongoing = serializers.BooleanField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    attendees_count = serializers.SerializerMethodField()
    
    class Meta:
        model = OnlineEventInfo
        fields = [
            'id', 'event', 'event_id', 'session_name', 'start_time', 'end_time',
            'session_notes', 'link', 'status', 'platform', 'access_code',
            'max_participants', 'is_active', 'created_at', 'updated_at',
            'duration_minutes', 'is_ongoing', 'is_upcoming', 'is_past',
            'attendees_count'
        ]
        read_only_fields = ['created_at', 'updated_at', 'duration_minutes',
                           'is_ongoing', 'is_upcoming', 'is_past']
    
    def get_attendees_count(self, obj):
        """Получить количество участников сессии"""
        return obj.attendances.count()
    
    def validate(self, data):
        """Валидация данных онлайн-сессии"""
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        if end_time and start_time and end_time <= start_time:
            raise serializers.ValidationError({
                'end_time': 'Время окончания должно быть позже времени начала'
            })
        
        if self.instance is None and start_time and start_time < timezone.now():
            raise serializers.ValidationError({
                'start_time': 'Время начала не может быть в прошлом для новых сессий'
            })
        
        return data


class SessionAttendanceSerializer(serializers.ModelSerializer):
    """Сериализатор для SessionAttendance"""
    session = OnlineEventInfoSerializer(read_only=True)
    session_id = serializers.PrimaryKeyRelatedField(
        queryset=OnlineEventInfo.objects.all(),
        source='session',
        write_only=True
    )
    participant = UserSimpleSerializer(read_only=True)
    participant_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='participant',
        write_only=True
    )
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = SessionAttendance
        fields = [
            'id', 'session', 'session_id', 'participant', 'participant_id',
            'joined_at', 'left_at', 'status', 'duration_seconds', 'rating',
            'feedback', 'is_active'
        ]
        read_only_fields = ['joined_at', 'left_at', 'duration_seconds', 'is_active']
    
    def validate(self, data):
        """Валидация данных посещения"""
        session = data.get('session')
        participant = data.get('participant')
        
        if self.instance is None:
            if SessionAttendance.objects.filter(session=session, participant=participant).exists():
                raise serializers.ValidationError({
                    'participant': 'Этот пользователь уже зарегистрирован на данную сессию'
                })
        
        if session and session.max_participants:
            current_count = session.attendances.count()
            if current_count >= session.max_participants:
                raise serializers.ValidationError({
                    'session': 'Достигнут лимит участников для этой сессии'
                })
        
        return data


class SessionMaterialSerializer(serializers.ModelSerializer):
    """Сериализатор для SessionMaterial"""
    session = OnlineEventInfoSerializer(read_only=True)
    session_id = serializers.PrimaryKeyRelatedField(
        queryset=OnlineEventInfo.objects.all(),
        source='session',
        write_only=True
    )
    uploaded_by = UserSimpleSerializer(read_only=True)
    uploaded_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='uploaded_by',
        write_only=True,
        required=False
    )
    file_display = serializers.CharField(read_only=True)
    
    class Meta:
        model = SessionMaterial
        fields = [
            'id', 'session', 'session_id', 'title', 'description',
            'file', 'file_url', 'material_type', 'uploaded_by',
            'uploaded_by_id', 'uploaded_at', 'is_public', 'file_display'
        ]
        read_only_fields = ['uploaded_at', 'uploaded_by', 'file_display']
    
    def create(self, validated_data):
        """Создание материала с автоматическим назначением загрузившего"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['uploaded_by'] = request.user
        return super().create(validated_data)


class OfflineSessionsInfoSerializer(serializers.ModelSerializer):
    """Сериализатор для OfflineSessionsInfo"""
    event = EventSerializer(read_only=True)
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        source='event',
        write_only=True
    )
    duration_minutes = serializers.IntegerField(read_only=True)
    is_ongoing = serializers.BooleanField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    full_location = serializers.CharField(read_only=True)
    
    class Meta:
        model = OfflineSessionsInfo
        fields = [
            'id', 'event', 'event_id', 'session_name', 'start_time', 'end_time',
            'session_notes', 'address', 'room', 'status', 'max_participants',
            'is_active', 'created_at', 'updated_at', 'duration_minutes',
            'is_ongoing', 'is_upcoming', 'is_past', 'full_location'
        ]
        read_only_fields = ['created_at', 'updated_at', 'duration_minutes',
                           'is_ongoing', 'is_upcoming', 'is_past', 'full_location']
    
    def validate(self, data):
        """Валидация данных оффлайн-сессии"""
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        if end_time and start_time and end_time <= start_time:
            raise serializers.ValidationError({
                'end_time': 'Время окончания должно быть позже времени начала'
            })
        
        if self.instance is None and start_time and start_time < timezone.now():
            raise serializers.ValidationError({
                'start_time': 'Время начала не может быть в прошлом для новых сессий'
            })
        
        return data


# ====================
# Вложенные сериализаторы для детального просмотра
# ====================

class EventDetailSerializer(EventSerializer):
    """Детальный сериализатор для Event с вложенными объектами"""
    online_sessions = OnlineEventInfoSerializer(many=True, read_only=True)
    offline_sessions = OfflineSessionsInfoSerializer(many=True, read_only=True)
    participants = EventParticipantSerializer(
        source='event_participants',
        many=True,
        read_only=True
    )
    files = EventFileSimpleSerializer(source='event_files', many=True, read_only=True)  # ← ДОБАВЛЕНО
    current_user_participation = serializers.SerializerMethodField()
    
    class Meta(EventSerializer.Meta):
        fields = EventSerializer.Meta.fields + [
            'online_sessions', 'offline_sessions', 'participants',
            'files',  # ← ДОБАВЛЕНО
            'current_user_participation'
        ]
    
    def get_current_user_participation(self, obj):
        """Получить информацию об участии текущего пользователя"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Ищем участие пользователя в этом событии
            participation = EventParticipant.objects.filter(
                event=obj,
                user=request.user,
                is_confirmed=True
            ).first()
            
            if participation:
                return {
                    'id': participation.id,
                    'role': participation.role,
                    'role_display': participation.get_role_display(),
                    'is_confirmed': participation.is_confirmed,
                    'registered_at': participation.registered_at
                }
        return None


class EventWithParticipationSerializer(EventSerializer):
    """Сериализатор для события с информацией о участии текущего пользователя"""
    current_user_participation = serializers.SerializerMethodField()
    
    class Meta(EventSerializer.Meta):
        fields = EventSerializer.Meta.fields + ['current_user_participation']
    
    def get_current_user_participation(self, obj):
        """Получить информацию об участии текущего пользователя"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Ищем участие пользователя в этом событии
            participation = EventParticipant.objects.filter(
                event=obj,
                user=request.user,
                is_confirmed=True
            ).first()
            
            if participation:
                return {
                    'id': participation.id,
                    'role': participation.role,
                    'role_display': participation.get_role_display(),
                    'is_confirmed': participation.is_confirmed,
                    'registered_at': participation.registered_at
                }
        return None


class OnlineEventInfoDetailSerializer(OnlineEventInfoSerializer):
    """Детальный сериализатор для OnlineEventInfo с вложенными объектами"""
    attendances = SessionAttendanceSerializer(many=True, read_only=True)
    materials = SessionMaterialSerializer(many=True, read_only=True)
    
    class Meta(OnlineEventInfoSerializer.Meta):
        fields = OnlineEventInfoSerializer.Meta.fields + [
            'attendances', 'materials'
        ]