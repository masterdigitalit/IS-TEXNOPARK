from rest_framework import serializers
from django.contrib.auth import get_user_model
from events.models import Event, OnlineEventInfo
from .models import (
    ProjectWork, EvaluationCriteria, Evaluation,
    CachedStatistic, JudgeWeight, StatisticSnapshot
)

User = get_user_model()


# Базовые сериализаторы
class UserSerializer(serializers.ModelSerializer):
    """Сериализатор для пользователя."""
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name']


class EventSerializer(serializers.ModelSerializer):
    """Сериализатор для мероприятия."""
    class Meta:
        model = Event
        fields = ['id', 'name', 'status', 'created_at', 'closes_at']


class OnlineEventInfoSerializer(serializers.ModelSerializer):
    """Сериализатор для онлайн-сессии."""
    class Meta:
        model = OnlineEventInfo
        fields = ['id', 'session_name', 'start_time', 'end_time', 'status']


# Основные сериализаторы
class ProjectWorkSerializer(serializers.ModelSerializer):
    """Сериализатор для работы участника."""
    event = EventSerializer(read_only=True)
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        source='event',
        write_only=True
    )
    
    participant = UserSerializer(read_only=True)
    participant_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='participant',
        write_only=True
    )
    
    has_file = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = ProjectWork
        fields = [
            'id', 'title', 'description', 'event', 'event_id',
            'participant', 'participant_id', 'file', 'file_url',
            'status', 'category', 'is_published', 'has_file',
            'submitted_at', 'updated_at'
        ]
        read_only_fields = ['submitted_at', 'updated_at']
    
    def validate(self, data):
        """Проверка, что участник действительно участник мероприятия."""
        event = data.get('event')
        participant = data.get('participant')
        
        if event and participant:
            from events.models import EventParticipant
            is_participant = EventParticipant.objects.filter(
                event=event,
                user=participant,
                role='participant',
                is_confirmed=True
            ).exists()
            
            if not is_participant:
                raise serializers.ValidationError(
                    "Пользователь не является участником этого мероприятия"
                )
        
        return data


class EvaluationCriteriaSerializer(serializers.ModelSerializer):
    """Сериализатор для критерия оценки."""
    event = EventSerializer(read_only=True)
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        source='event',
        write_only=True
    )
    
    class Meta:
        model = EvaluationCriteria
        fields = [
            'id', 'name', 'description', 'event', 'event_id',
            'max_score', 'weight', 'order', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class EvaluationSerializer(serializers.ModelSerializer):
    """Сериализатор для оценки судьи."""
    project = ProjectWorkSerializer(read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=ProjectWork.objects.all(),
        source='project',
        write_only=True
    )
    
    judge = UserSerializer(read_only=True)
    judge_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='judge',
        write_only=True
    )
    
    criteria = EvaluationCriteriaSerializer(read_only=True)
    criteria_id = serializers.PrimaryKeyRelatedField(
        queryset=EvaluationCriteria.objects.all(),
        source='criteria',
        write_only=True
    )
    
    session = OnlineEventInfoSerializer(read_only=True)
    session_id = serializers.PrimaryKeyRelatedField(
        queryset=OnlineEventInfo.objects.all(),
        source='session',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Evaluation
        fields = [
            'id', 'project', 'project_id', 'judge', 'judge_id',
            'criteria', 'criteria_id', 'score', 'comment',
            'session', 'session_id', 'is_confirmed', 'confirmed_at',
            'evaluated_at'
        ]
        read_only_fields = ['evaluated_at', 'confirmed_at']
    
    def validate(self, data):
        """Проверка, что судья действительно судья мероприятия."""
        project = data.get('project')
        judge = data.get('judge')
        
        if project and judge:
            from events.models import EventParticipant
            is_referee = EventParticipant.objects.filter(
                event=project.event,
                user=judge,
                role='referee',
                is_confirmed=True
            ).exists()
            
            if not is_referee:
                raise serializers.ValidationError(
                    "Пользователь не является судьей этого мероприятия"
                )
        
        # Проверка, что оценка не превышает максимальный балл критерия
        criteria = data.get('criteria')
        score = data.get('score')
        
        if criteria and score:
            if score > criteria.max_score:
                raise serializers.ValidationError(
                    f"Оценка не может превышать максимальный балл критерия ({criteria.max_score})"
                )
            if score < 0:
                raise serializers.ValidationError(
                    "Оценка не может быть отрицательной"
                )
        
        return data


class JudgeWeightSerializer(serializers.ModelSerializer):
    """Сериализатор для веса судьи."""
    event = EventSerializer(read_only=True)
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        source='event',
        write_only=True
    )
    
    judge = UserSerializer(read_only=True)
    judge_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='judge',
        write_only=True
    )
    
    class Meta:
        model = JudgeWeight
        fields = [
            'id', 'judge', 'judge_id', 'event', 'event_id',
            'weight', 'calculation_method', 'calculated_at'
        ]
        read_only_fields = ['calculated_at']
    
    def validate(self, data):
        """Проверка, что судья действительно судья мероприятия."""
        event = data.get('event')
        judge = data.get('judge')
        
        if event and judge:
            from events.models import EventParticipant
            is_referee = EventParticipant.objects.filter(
                event=event,
                user=judge,
                role='referee',
                is_confirmed=True
            ).exists()
            
            if not is_referee:
                raise serializers.ValidationError(
                    "Пользователь не является судьей этого мероприятия"
                )
        
        # Проверка веса
        weight = data.get('weight')
        if weight and (weight < 0.1 or weight > 3.0):
            raise serializers.ValidationError(
                "Вес судьи должен быть в диапазоне от 0.1 до 3.0"
            )
        
        return data


class CachedStatisticSerializer(serializers.ModelSerializer):
    """Сериализатор для кэшированной статистики."""
    event = EventSerializer(read_only=True)
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        source='event',
        write_only=True
    )
    
    is_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CachedStatistic
        fields = [
            'id', 'event', 'event_id', 'statistic_type', 'data',
            'calculated_at', 'expires_at', 'version', 'is_expired'
        ]
        read_only_fields = ['calculated_at', 'version']


class StatisticSnapshotSerializer(serializers.ModelSerializer):
    """Сериализатор для снимка статистики."""
    event = EventSerializer(read_only=True)
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        source='event',
        write_only=True
    )
    
    class Meta:
        model = StatisticSnapshot
        fields = [
            'id', 'event', 'event_id', 'snapshot_type', 'data',
            'taken_at', 'created_at', 'notes'
        ]
        read_only_fields = ['created_at']


# Сериализаторы для статистики (не модели)
class ProjectStatisticsSerializer(serializers.Serializer):
    """Сериализатор для статистики работы."""
    project_id = serializers.IntegerField()
    title = serializers.CharField()
    participant_email = serializers.EmailField()
    weighted_average = serializers.FloatField()
    raw_average = serializers.FloatField()
    evaluation_count = serializers.IntegerField()
    criteria_details = serializers.ListField()


class EventSummarySerializer(serializers.Serializer):
    """Сериализатор для сводки по мероприятию."""
    event_id = serializers.IntegerField()
    event_name = serializers.CharField()
    event_status = serializers.CharField()
    
    participants = serializers.DictField()
    projects = serializers.DictField()
    evaluations = serializers.DictField()
    
    project_rankings = serializers.ListField()
    criteria = serializers.ListField()
    
    calculated_at = serializers.DateTimeField()


class ParticipantStatisticsSerializer(serializers.Serializer):
    """Сериализатор для статистики участника."""
    user_id = serializers.IntegerField()
    email = serializers.EmailField()
    role = serializers.CharField()
    
    project = serializers.DictField(allow_null=True)
    ranking = serializers.DictField(allow_null=True)
    judge_feedback = serializers.ListField()
    engagement = serializers.DictField()


class LeaderboardSerializer(serializers.Serializer):
    """Сериализатор для рейтинга."""
    rank = serializers.IntegerField()
    project_id = serializers.IntegerField()
    title = serializers.CharField()
    participant_email = serializers.EmailField()
    participant_name = serializers.CharField(allow_blank=True)
    weighted_average = serializers.FloatField()
    evaluation_count = serializers.IntegerField()
    submitted_at = serializers.DateTimeField()


class TrendAnalysisSerializer(serializers.Serializer):
    """Сериализатор для анализа тренда."""
    trend = serializers.CharField()
    data_points = serializers.IntegerField()
    first_half_average = serializers.FloatField()
    second_half_average = serializers.FloatField()
    difference = serializers.FloatField()


class JudgeConsensusSerializer(serializers.Serializer):
    """Сериализатор для консенсуса судей."""
    average_consensus = serializers.FloatField()
    project_count = serializers.IntegerField()
    consensus_level = serializers.CharField()
    projects = serializers.ListField(required=False)


# Вложенные сериализаторы для форм
class EvaluationCreateSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для создания оценки."""
    class Meta:
        model = Evaluation
        fields = ['project_id', 'judge_id', 'criteria_id', 'score', 'comment', 'session_id']
    
    def validate(self, data):
        # Та же валидация, что и в основном сериализаторе
        return super().validate(data)


class ProjectWorkCreateSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для создания работы."""
    class Meta:
        model = ProjectWork
        fields = ['event_id', 'title', 'description', 'file', 'file_url', 'category']
    
    def create(self, validated_data):
        # Автоматически устанавливаем текущего пользователя как участника
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['participant'] = request.user
        return super().create(validated_data)