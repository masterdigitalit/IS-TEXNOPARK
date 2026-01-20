
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from events.models import Event, EventParticipant
from .services import StatisticsService


class StatisticsViewSet(viewsets.ViewSet):
    """
    ViewSet для получения статистики.
    """
    permission_classes = [IsAuthenticated]
    
    def get_event_and_check_access(self, event_id):
        """
        Получает мероприятие и проверяет доступ пользователя.
        """
        event = get_object_or_404(Event, id=event_id)
        
        # Проверяем, является ли пользователь участником мероприятия
        if not EventParticipant.objects.filter(
            event=event,
            user=self.request.user
        ).exists():
            # Для некоторых эндпоинтов разрешаем доступ организатору
            if not self.request.user.is_staff and event.owner != self.request.user:
                raise PermissionError("Нет доступа к статистике этого мероприятия")
        
        return event
    
    @action(detail=False, methods=['get'], url_path='event/(?P<event_id>\d+)/summary')
    def event_summary(self, request, event_id=None):
        """
        Получить сводную статистику по мероприятию.
        """
        try:
            self.get_event_and_check_access(event_id)
            summary = StatisticsService.get_event_summary(event_id)
            return Response(summary)
        except PermissionError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='event/(?P<event_id>\d+)/participant-stats')
    def participant_stats(self, request, event_id=None):
        """
        Получить статистику для текущего пользователя на мероприятии.
        """
        try:
            self.get_event_and_check_access(event_id)
            stats = StatisticsService.get_participant_statistics(
                request.user.id,
                event_id
            )
            return Response(stats)
        except PermissionError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='event/(?P<event_id>\d+)/leaderboard')
    def leaderboard(self, request, event_id=None):
        """
        Получить текущий рейтинг работ.
        """
        try:
            event = self.get_event_and_check_access(event_id)
            
            # Проверяем, опубликованы ли результаты
            if event.results_published_at and event.results_published_at > timezone.now():
                # Результаты еще не опубликованы
                if not request.user.is_staff and event.owner != request.user:
                    return Response({
                        'error': 'Результаты еще не опубликованы'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            limit = int(request.query_params.get('limit', 20))
            leaderboard = StatisticsService.get_leaderboard(event_id, limit)
            
            return Response(leaderboard)
        except PermissionError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)