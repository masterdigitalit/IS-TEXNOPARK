# user/views.py - добавляем к UserViewSet
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet для работы с уведомлениями пользователя
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'is_read']
    ordering = ['-created_at']
    
    def get_queryset(self):
        # Пользователь видит только свои уведомления
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Количество непрочитанных уведомлений"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Пометить уведомление как прочитанное"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'status': 'marked as read'})
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Пометить все уведомления как прочитанные"""
        queryset = self.get_queryset().filter(is_read=False)
        updated = queryset.update(is_read=True, read_at=timezone.now())
        return Response({'marked_count': updated})
    
    @action(detail=False, methods=['delete'])
    def delete_all_read(self, request):
        """Удалить все прочитанные уведомления"""
        deleted, _ = self.get_queryset().filter(is_read=True).delete()
        return Response({'deleted_count': deleted})