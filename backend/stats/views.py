from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Avg
from .models import EventRating, EventStatistics, EventParticipantStatistics
from .serializers import EventRatingSerializer, EventStatisticsSerializer, RatingCreateSerializer, EventParticipantStatisticsSerializer
from events.models import Event, EventParticipant, OnlineEventInfo, OfflineSessionsInfo


class RateParticipantView(generics.CreateAPIView):
    """
    Представление для оценки участника судьей.
    """
    queryset = EventRating.objects.all()
    serializer_class = RatingCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Проверяем, что судья действительно является судьей в этом событии
        event = serializer.validated_data['event']
        referee = serializer.validated_data['referee']

        # Проверяем права судьи
        try:
            referee_participation = EventParticipant.objects.get(
                event=event,
                user=referee,
                role='referee'
            )
        except EventParticipant.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Пользователь не является судьей в этом событии")

        # Сохраняем оценку
        rating = serializer.save()

        # Статистика будет пересчитана автоматически при сохранении оценки
        # благодаря переопределенному методу save в модели EventRating


class EventRatingsListView(generics.ListAPIView):
    """
    Представление для просмотра всех оценок для события.
    """
    serializer_class = EventRatingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        event_id = self.kwargs['event_id']
        return EventRating.objects.filter(event_id=event_id)


class OnlineSessionRatingsListView(generics.ListAPIView):
    """
    Представление для просмотра всех оценок для онлайн-сессии.
    """
    serializer_class = EventRatingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        session_id = self.kwargs['session_id']
        return EventRating.objects.filter(online_session_id=session_id)


class OfflineSessionRatingsListView(generics.ListAPIView):
    """
    Представление для просмотра всех оценок для оффлайн-сессии.
    """
    serializer_class = EventRatingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        session_id = self.kwargs['session_id']
        return EventRating.objects.filter(offline_session_id=session_id)


class ParticipantRatingsListView(generics.ListAPIView):
    """
    Представление для просмотра всех оценок для участника в событии.
    """
    serializer_class = EventRatingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        event_id = self.kwargs['event_id']
        participant_id = self.kwargs['participant_id']
        return EventRating.objects.filter(
            event_id=event_id,
            participant_id=participant_id
        )


class EventStatisticsDetailView(generics.RetrieveAPIView):
    """
    Представление для получения статистики события.
    """
    serializer_class = EventStatisticsSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'event_id'
    lookup_url_kwarg = 'event_id'

    def get_queryset(self):
        return EventStatistics.objects.all()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calculate_event_statistics(request, event_id):
    """
    API endpoint для ручного пересчета статистики события.
    """
    event = get_object_or_404(Event, id=event_id)
    
    # Проверяем, что пользователь является владельцем события или администратором
    if request.user != event.owner and not request.user.is_staff:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("У вас нет прав для пересчета статистики этого события")
    
    statistics = EventStatistics.calculate_for_event(event)
    serializer = EventStatisticsSerializer(statistics)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_event_leaderboard(request, event_id):
    """
    API endpoint для получения списка участников с их средними оценками (рейтинг).
    """
    event = get_object_or_404(Event, id=event_id)
    
    # Проверяем права доступа к событию
    try:
        participant = EventParticipant.objects.get(event=event, user=request.user)
        if participant.role not in ['referee', 'owner'] and not request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("У вас нет прав для просмотра рейтинга этого события")
    except EventParticipant.DoesNotExist:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("У вас нет прав для просмотра рейтинга этого события")
    
    # Получаем средние оценки для каждого участника (только для пятибалльной системы)
    leaderboard_data = (
        EventRating.objects
        .filter(event=event, grading_system='five_point')
        .values('participant__id', 'participant__user__first_name', 'participant__user__middle_name', 'participant__user__last_name')
        .annotate(avg_score=Avg('score'))
        .order_by('-avg_score')
    )
    
    # Формируем ответ
    leaderboard = []
    for idx, item in enumerate(leaderboard_data, start=1):
        participant_name = f"{item['participant__user__middle_name'] or ''} {item['participant__user__first_name'] or ''} {item['participant__user__last_name'] or ''}".strip()
        leaderboard.append({
            'position': idx,
            'participant_id': item['participant__id'],
            'participant_name': participant_name,
            'average_score': float(item['avg_score']) if item['avg_score'] else 0.0
        })
    
    return Response(leaderboard, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_event_participant_statistics(request, event_id):
    """
    API endpoint для получения статистики всех участников события.
    """
    event = get_object_or_404(Event, id=event_id)

    # Проверяем права доступа к событию
    try:
        participant = EventParticipant.objects.get(event=event, user=request.user)
        if participant.role not in ['referee', 'owner'] and not request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("У вас нет прав для просмотра статистики этого события")
    except EventParticipant.DoesNotExist:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("У вас нет прав для просмотра статистики этого события")

    # Получаем статистику для всех участников события
    participant_stats = EventParticipantStatistics.objects.filter(event=event)
    serializer = EventParticipantStatisticsSerializer(participant_stats, many=True)

    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_participant_final_score(request, event_id, participant_id):
    """
    API endpoint для получения итоговой оценки конкретного участника.
    """
    event = get_object_or_404(Event, id=event_id)
    participant = get_object_or_404(EventParticipant, id=participant_id, event=event)

    # Проверяем права доступа к событию
    try:
        requester_participant = EventParticipant.objects.get(event=event, user=request.user)
        if requester_participant.role not in ['referee', 'owner'] and not request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("У вас нет прав для просмотра статистики этого события")
    except EventParticipant.DoesNotExist:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("У вас нет прав для просмотра статистики этого события")

    # Получаем или вычисляем статистику для участника
    stats, created = EventParticipantStatistics.objects.get_or_create(event=event, participant=participant)
    if created or True:  # Всегда пересчитываем для актуальности
        stats = EventParticipantStatistics.calculate_for_participant(event, participant)

    serializer = EventParticipantStatisticsSerializer(stats)
    return Response(serializer.data, status=status.HTTP_200_OK)




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_online_session_statistics(request, session_id):
    """
    API endpoint для получения статистики онлайн-сессии.
    """
    session = get_object_or_404(OnlineEventInfo, id=session_id)

    # Проверяем права доступа к событию
    try:
        participant = EventParticipant.objects.get(event=session.event, user=request.user)
        if participant.role not in ['referee', 'owner'] and not request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("У вас нет прав для просмотра статистики этой сессии")
    except EventParticipant.DoesNotExist:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("У вас нет прав для просмотра статистики этой сессии")

    # Получаем статистику для сессии
    stats = EventStatistics.calculate_for_session(session)

    return Response(stats, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_offline_session_statistics(request, session_id):
    """
    API endpoint для получения статистики оффлайн-сессии.
    """
    session = get_object_or_404(OfflineSessionsInfo, id=session_id)

    # Проверяем права доступа к событию
    try:
        participant = EventParticipant.objects.get(event=session.event, user=request.user)
        if participant.role not in ['referee', 'owner'] and not request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("У вас нет прав для просмотра статистики этой сессии")
    except EventParticipant.DoesNotExist:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("У вас нет прав для просмотра статистики этой сессии")

    # Получаем статистику для сессии
    stats = EventStatistics.calculate_for_session(session)

    return Response(stats, status=status.HTTP_200_OK)