from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Count, Q, Avg
from .models import Event, EventParticipant, OnlineEventInfo, SessionAttendance, SessionMaterial


class UserSerializer(serializers.ModelSerializer):
    """Сериализатор для пользователя"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id', 'username']


class OnlineEventInfoSerializer(serializers.ModelSerializer):
    """Сериализатор для онлайн-сессий"""
    event_name = serializers.CharField(source='event.name', read_only=True)
    event_id = serializers.IntegerField(source='event.id', read_only=True)
    duration_minutes = serializers.IntegerField(read_only=True)
    is_ongoing = serializers.BooleanField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    can_join = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    
    class Meta:
        model = OnlineEventInfo
        fields = [
            'id',
            'event_id',
            'event_name',
            'session_name',
            'start_time',
            'end_time',
            'duration_minutes',
            'session_notes',
            'link',
            'status',
            'platform',
            'access_code',
            'max_participants',
            'is_active',
            'created_at',
            'updated_at',
            'is_ongoing',
            'is_upcoming',
            'is_past',
            'can_join',
            'participant_count'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'duration_minutes',
            'is_ongoing', 'is_upcoming', 'is_past', 'participant_count'
        ]
    
    def get_can_join(self, obj):
        """Может ли текущий пользователь присоединиться к сессии"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.is_ongoing and bool(obj.link) and obj.is_active
        return False
    
    def get_participant_count(self, obj):
        """Количество участников сессии"""
        return getattr(obj, 'attendance_count', obj.attendances.count())


class OnlineEventInfoCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания онлайн-сессии"""
    
    class Meta:
        model = OnlineEventInfo
        fields = [
            'event',
            'session_name',
            'start_time',
            'end_time',
            'session_notes',
            'link',
            'platform',
            'access_code',
            'max_participants',
            'is_active'
        ]
    
    def validate(self, data):
        """Валидация при создании"""
        request = self.context.get('request')
        event = data.get('event')
        
        # Проверка прав доступа
        if request and request.user.is_authenticated and event:
            if event.owner != request.user and not request.user.is_staff:
                raise serializers.ValidationError({
                    'event': 'Вы можете создавать сессии только для своих событий'
                })
        
        # Валидация времени
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        if start_time and start_time < timezone.now():
            raise serializers.ValidationError({
                'start_time': 'Время начала не может быть в прошлом'
            })
        
        if end_time and start_time and end_time <= start_time:
            raise serializers.ValidationError({
                'end_time': 'Время окончания должно быть позже времени начала'
            })
        
        return data


class OnlineEventInfoUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления онлайн-сессии"""
    
    class Meta:
        model = OnlineEventInfo
        fields = [
            'session_name',
            'start_time',
            'end_time',
            'session_notes',
            'link',
            'status',
            'platform',
            'access_code',
            'max_participants',
            'is_active'
        ]
    
    def validate(self, data):
        """Валидация при обновлении"""
        request = self.context.get('request')
        instance = self.instance
        
        # Проверка прав
        if request and request.user.is_authenticated:
            if instance.event.owner != request.user and not request.user.is_staff:
                raise serializers.ValidationError({
                    'detail': 'Вы можете редактировать только сессии своих событий'
                })
        
        # Если сессия уже началась или завершена
        if instance.status in ['ongoing', 'completed', 'cancelled']:
            restricted_fields = {'start_time', 'end_time'}
            for field in restricted_fields:
                if field in data and data[field] != getattr(instance, field):
                    raise serializers.ValidationError({
                        field: f'Нельзя изменять {field} после начала сессии'
                    })
        
        # Валидация времени
        start_time = data.get('start_time', instance.start_time)
        end_time = data.get('end_time', instance.end_time)
        
        if end_time and end_time <= start_time:
            raise serializers.ValidationError({
                'end_time': 'Время окончания должно быть позже времени начала'
            })
        
        return data


class EventListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка событий"""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    is_open = serializers.BooleanField(read_only=True)
    days_remaining = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    online_sessions_count = serializers.SerializerMethodField()
    has_online_sessions = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id',
            'name',
            'owner_username',
            'status',
            'created_at',
            'closes_at',
            'is_open',
            'is_active',
            'image_url',
            'days_remaining',
            'participant_count',
            'online_sessions_count',
            'has_online_sessions'
        ]
        read_only_fields = ['id', 'created_at', 'is_open', 'owner_username']
    
    def get_days_remaining(self, obj):
        """Количество дней до закрытия события"""
        if obj.closes_at:
            delta = obj.closes_at - timezone.now()
            return max(0, delta.days)
        return None
    
    def get_participant_count(self, obj):
        """Количество участников события"""
        return getattr(obj, 'participants_count', obj.event_participants.count())
    
    def get_online_sessions_count(self, obj):
        """Количество онлайн-сессий события"""
        return getattr(obj, 'online_sessions_count', obj.online_sessions.count())
    
    def get_has_online_sessions(self, obj):
        """Есть ли онлайн-сессии"""
        return self.get_online_sessions_count(obj) > 0


class EventDetailSerializer(serializers.ModelSerializer):
    """Сериализатор для детального просмотра события"""
    owner = UserSerializer(read_only=True)
    is_open = serializers.BooleanField(read_only=True)
    participant_count = serializers.SerializerMethodField()
    online_sessions = OnlineEventInfoSerializer(many=True, read_only=True)
    online_sessions_count = serializers.SerializerMethodField()
    upcoming_sessions = serializers.SerializerMethodField()
    ongoing_sessions = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_join = serializers.SerializerMethodField()
    is_joined = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id',
            'name',
            'description',
            'owner',
            'status',
            'created_at',
            'updated_at',
            'closes_at',
            'image_url',
            'is_open',
            'is_active',
            'participant_count',
            'online_sessions',
            'online_sessions_count',
            'upcoming_sessions',
            'ongoing_sessions',
            'can_edit',
            'can_join',
            'is_joined'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'is_open', 
            'owner', 'participant_count', 'online_sessions',
            'online_sessions_count'
        ]
    
    def get_participant_count(self, obj):
        return getattr(obj, 'participants_count', obj.event_participants.count())
    
    def get_online_sessions_count(self, obj):
        return getattr(obj, 'online_sessions_count', obj.online_sessions.count())
    
    def get_upcoming_sessions(self, obj):
        """Получить предстоящие онлайн-сессии"""
        sessions = obj.upcoming_online_sessions[:10]
        return OnlineEventInfoSerializer(sessions, many=True, context=self.context).data
    
    def get_ongoing_sessions(self, obj):
        """Получить текущие онлайн-сессии"""
        sessions = obj.ongoing_online_sessions
        return OnlineEventInfoSerializer(sessions, many=True, context=self.context).data
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user == obj.owner or request.user.is_staff
        return False
    
    def get_can_join(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        user = request.user
        return bool(
            user != obj.owner and
            obj.is_open and
            obj.status == 'published' and
            not obj.event_participants.filter(user=user).exists()
        )
    
    def get_is_joined(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        return obj.event_participants.filter(user=request.user).exists()


class EventCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания события"""
    
    class Meta:
        model = Event
        fields = [
            'name',
            'description',
            'status',
            'closes_at',
            'image_url',
            'is_active'
        ]
    
    def validate_closes_at(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError(
                "Дата закрытия должна быть в будущем"
            )
        return value
    
    def validate_status(self, value):
        if value == 'published' and not self.initial_data.get('closes_at'):
            raise serializers.ValidationError(
                "Для публикации события необходимо указать дату закрытия"
            )
        return value
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['owner'] = request.user
            return super().create(validated_data)
        raise serializers.ValidationError(
            "Требуется авторизация для создания события"
        )


class EventUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления события"""
    
    class Meta:
        model = Event
        fields = [
            'name',
            'description',
            'status',
            'closes_at',
            'image_url',
            'is_active'
        ]
        read_only_fields = ['owner']
    
    def validate(self, data):
        """Валидация при обновлении"""
        request = self.context.get('request')
        instance = self.instance
        
        if request and request.user.is_authenticated:
            if instance.owner != request.user and not request.user.is_staff:
                raise serializers.ValidationError({
                    'detail': 'Вы не можете редактировать это событие'
                })
        
        return data


class SessionJoinSerializer(serializers.Serializer):
    """Сериализатор для присоединения к онлайн-сессии"""
    
    def validate(self, data):
        request = self.context.get('request')
        session = self.context.get('session')
        
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Требуется авторизация")
        
        if not session:
            raise serializers.ValidationError("Сессия не найдена")
        
        if not session.is_ongoing:
            raise serializers.ValidationError("Сессия не активна")
        
        if not session.link:
            raise serializers.ValidationError("Ссылка на сессию не указана")
        
        # Проверяем, является ли пользователь участником события
        is_participant = session.event.event_participants.filter(
            user=request.user
        ).exists()
        is_owner = session.event.owner == request.user
        
        if not is_participant and not is_owner:
            raise serializers.ValidationError(
                "Вы должны быть участником события для присоединения к сессии"
            )
        
        return data


class SessionAttendanceSerializer(serializers.ModelSerializer):
    """Сериализатор для посещаемости сессий"""
    user = UserSerializer(read_only=True)
    session_name = serializers.CharField(source='session.session_name', read_only=True)
    event_name = serializers.CharField(source='session.event.name', read_only=True)
    
    class Meta:
        model = SessionAttendance
        fields = [
            'id',
            'user',
            'session',
            'session_name',
            'event_name',
            'joined_at',
            'left_at',
            'status',
            'duration_seconds',
            'rating',
            'feedback'
        ]
        read_only_fields = ['id', 'joined_at', 'duration_seconds', 'user']
    
    def validate_rating(self, value):
        if value and (value < 1 or value > 5):
            raise serializers.ValidationError("Рейтинг должен быть от 1 до 5")
        return value


class SessionMaterialSerializer(serializers.ModelSerializer):
    """Сериализатор для материалов сессии"""
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    session_name = serializers.CharField(source='session.session_name', read_only=True)
    file_display = serializers.CharField(source='file_display', read_only=True)
    
    class Meta:
        model = SessionMaterial
        fields = [
            'id',
            'session',
            'session_name',
            'title',
            'description',
            'file',
            'file_url',
            'file_display',
            'material_type',
            'uploaded_at',
            'uploaded_by',
            'uploaded_by_username',
            'is_public'
        ]
        read_only_fields = ['id', 'uploaded_at', 'uploaded_by', 'file_display']


class EventParticipantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True)
    
    class Meta:
        model = EventParticipant
        fields = [
            'id',
            'user',
            'event',
            'event_name',
            'role',
            'is_confirmed',
            'registered_at'
        ]
        read_only_fields = ['id', 'registered_at', 'user', 'event']


class EventJoinSerializer(serializers.Serializer):
    role = serializers.CharField(
        max_length=50, 
        default='participant', 
        required=False
    )
    
    def validate(self, data):
        request = self.context.get('request')
        event = self.context.get('event')
        
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Требуется авторизация")
        
        if not event:
            raise serializers.ValidationError("Событие не найдено")
        
        user = request.user
        
        # Быстрые проверки через цепочку условий
        if user == event.owner:
            raise serializers.ValidationError(
                "Организатор не может присоединиться как участник"
            )
        
        if not event.is_open:
            raise serializers.ValidationError("Регистрация на событие закрыта")
        
        if event.status != 'published':
            raise serializers.ValidationError("Событие не опубликовано")
        
        if EventParticipant.objects.filter(event=event, user=user).exists():
            raise serializers.ValidationError("Вы уже участвуете в этом событии")
        
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        event = self.context.get('event')
        
        return EventParticipant.objects.create(
            event=event,
            user=request.user,
            role=validated_data.get('role', 'participant')
        )


class EventLeaveSerializer(serializers.Serializer):
    """Сериализатор для выхода из события"""
    
    def save(self):
        request = self.context.get('request')
        event = self.context.get('event')
        
        deleted_count, _ = EventParticipant.objects.filter(
            event=event, 
            user=request.user
        ).delete()
        
        return {
            'success': deleted_count > 0,
            'message': 'Вы вышли из события' if deleted_count > 0 else 'Запись не найдена'
        }


# Оптимизированные сериализаторы

class EventMinimalSerializer(serializers.ModelSerializer):
    """Минималистичный сериализатор для событий"""
    
    class Meta:
        model = Event
        fields = ['id', 'name', 'status', 'created_at']


class OnlineSessionMinimalSerializer(serializers.ModelSerializer):
    """Минималистичный сериализатор для онлайн-сессий"""
    event_name = serializers.CharField(source='event.name', read_only=True)
    is_ongoing = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = OnlineEventInfo
        fields = [
            'id', 
            'session_name', 
            'start_time', 
            'end_time',
            'event_name',
            'status',
            'platform',
            'link',
            'is_ongoing'
        ]


class CalendarSessionSerializer(serializers.ModelSerializer):
    """Сериализатор для календаря сессий"""
    event_name = serializers.CharField(source='event.name', read_only=True)
    event_status = serializers.CharField(source='event.status', read_only=True)
    
    class Meta:
        model = OnlineEventInfo
        fields = [
            'id',
            'session_name',
            'start_time',
            'end_time',
            'event_name',
            'event_status',
            'status',
            'platform',
            'link'
        ]


class EventStatisticsSerializer(serializers.Serializer):
    """Статистика по событиям"""
    total_events = serializers.IntegerField(min_value=0)
    published_events = serializers.IntegerField(min_value=0)
    active_events = serializers.IntegerField(min_value=0)
    total_participants = serializers.IntegerField(min_value=0)
    avg_participants_per_event = serializers.FloatField(min_value=0)
    events_by_status = serializers.DictField()
    online_sessions_count = serializers.IntegerField