from rest_framework import serializers
from .models import EventRating, EventStatistics, EventParticipantStatistics
from events.models import Event, EventParticipant
from user.models import User


class EventRatingSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели EventRating (оценки судей).
    """
    referee_name = serializers.CharField(source='referee.get_full_name', read_only=True)
    participant_name = serializers.CharField(source='participant.user.get_full_name', read_only=True)

    class Meta:
        model = EventRating
        fields = [
            'id', 'event', 'online_session', 'offline_session', 'participant', 'referee',
            'grading_system', 'score', 'comment', 'created_at', 'updated_at',
            'referee_name', 'participant_name'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        """
        Проверяем, что судья действительно является судьей в этом событии.
        """
        event = data['event']
        referee = data['referee']
        
        # Проверяем, что пользователь является судьей в этом событии
        try:
            referee_participation = EventParticipant.objects.get(
                event=event,
                user=referee,
                role='referee'
            )
        except EventParticipant.DoesNotExist:
            raise serializers.ValidationError({
                'referee': 'Пользователь не является судьей в этом событии'
            })
        
        # Проверяем, что участник действительно участвует в событии
        participant = data['participant']
        if participant.event != event:
            raise serializers.ValidationError({
                'participant': 'Участник не участвует в данном событии'
            })
        
        return data


class EventStatisticsSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели EventStatistics (статистика события).
    """
    event_name = serializers.CharField(source='event.name', read_only=True)

    class Meta:
        model = EventStatistics
        fields = [
            'id', 'event', 'event_name', 'average_score',
            'total_participants_rated', 'total_ratings_given',
            'count_grade_5_total', 'count_grade_4_total', 'count_grade_3_total', 'count_grade_2_total', 'count_grade_1_total',
            'count_pass_total', 'count_fail_total', 'most_popular_grade_total',
            'session_grade_distribution', 'session_averages', 'calculated_at'
        ]
        read_only_fields = ['calculated_at']


class EventParticipantStatisticsSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели EventParticipantStatistics (статистика участника события).
    """
    participant_name = serializers.CharField(source='participant.user.get_full_name', read_only=True)
    participant_email = serializers.CharField(source='participant.user.email', read_only=True)

    class Meta:
        model = EventParticipantStatistics
        fields = [
            'id', 'event', 'participant', 'participant_name', 'participant_email',
            'session_scores_count', 'final_score', 'average_score', 'most_popular_grades', 'calculated_at'
        ]
        read_only_fields = ['calculated_at']


class RatingCreateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для создания оценки (с дополнительной валидацией).
    """
    class Meta:
        model = EventRating
        fields = ['event', 'online_session', 'offline_session', 'participant', 'referee', 'grading_system', 'score', 'comment']

    def validate(self, data):
        """
        Проверяем, что судья действительно является судьей в этом событии.
        """
        event = data['event']
        referee = data['referee']

        # Проверяем, что пользователь является судьей в этом событии
        try:
            referee_participation = EventParticipant.objects.get(
                event=event,
                user=referee,
                role='referee'
            )
        except EventParticipant.DoesNotExist:
            raise serializers.ValidationError({
                'referee': 'Пользователь не является судьей в этом событии'
            })

        # Проверяем, что участник действительно участвует в событии
        participant = data['participant']
        if participant.event != event:
            raise serializers.ValidationError({
                'participant': 'Участник не участвует в данном событии'
            })

        # Проверяем, что судья не оценивает самого себя
        if participant.user == referee:
            raise serializers.ValidationError({
                'participant': 'Судья не может оценить самого себя'
            })

        # Проверяем, что не указаны одновременно онлайн и оффлайн сессии
        online_session = data.get('online_session')
        offline_session = data.get('offline_session')

        if online_session and offline_session:
            raise serializers.ValidationError({
                'online_session': 'Оценка не может быть одновременно связана с онлайн и оффлайн сессией',
                'offline_session': 'Оценка не может быть одновременно связана с онлайн и оффлайн сессией'
            })

        # Проверяем, что если указана сессия, она принадлежит событию
        if online_session and online_session.event != event:
            raise serializers.ValidationError({
                'online_session': 'Онлайн-сессия должна принадлежать указанному событию'
            })

        if offline_session and offline_session.event != event:
            raise serializers.ValidationError({
                'offline_session': 'Оффлайн-сессия должна принадлежать указанному событию'
            })

        return data