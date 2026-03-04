# events/views.py
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Exists, OuterRef
from django.utils import timezone
from django.contrib.auth import get_user_model
from notifications.models import Notification
from .models import (
    Event, EventParticipant, OnlineEventInfo,
    SessionAttendance, SessionMaterial, OfflineSessionsInfo
)
from .serializers import (
    EventSerializer, EventDetailSerializer, EventParticipantSerializer,
    OnlineEventInfoSerializer, OnlineEventInfoDetailSerializer,
    SessionAttendanceSerializer, SessionMaterialSerializer,
    OfflineSessionsInfoSerializer, UserSimpleSerializer,
    EventWithParticipationSerializer
)

User = get_user_model()


# ====================
# Pagination Classes
# ====================

class EventPagination(PageNumberPagination):
    """Пагинация для событий"""
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


# ====================
# Permission Classes
# ====================

class IsOwnerOrReadOnly(permissions.BasePermission):
    """Позволяет редактировать только владельцу объекта"""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS or request.method == 'OPTIONS':
            return True
        return obj.owner == request.user


class IsEventOwnerOrAdmin(permissions.BasePermission):
    """Позволяет редактировать только владельцу события или администратору"""
    def has_object_permission(self, request, view, obj):
        if request.method == 'OPTIONS':
            return True
        if request.user.is_staff or request.user.is_superuser:
            return True
        return obj.event.owner == request.user


class IsSessionOwnerOrAdmin(permissions.BasePermission):
    """Позволяет редактировать только владельцу сессии или администратору"""
    def has_object_permission(self, request, view, obj):
        if request.method == 'OPTIONS':
            return True
        if request.user.is_staff or request.user.is_superuser:
            return True
        return obj.session.event.owner == request.user


# ====================
# Filter Classes
# ====================

from django_filters import rest_framework as django_filters


class EventFilter(django_filters.FilterSet):
    """Фильтры для событий"""
    status = django_filters.ChoiceFilter(choices=Event.STATUS_CHOICES)
    is_active = django_filters.BooleanFilter()
    owner = django_filters.NumberFilter(field_name='owner__id')
    closes_after = django_filters.DateTimeFilter(field_name='closes_at', lookup_expr='gte')
    closes_before = django_filters.DateTimeFilter(field_name='closes_at', lookup_expr='lte')
    search = django_filters.CharFilter(method='filter_search')
    
    has_online_sessions = django_filters.BooleanFilter(method='filter_has_online_sessions')
    has_offline_sessions = django_filters.BooleanFilter(method='filter_has_offline_sessions')
    session_type = django_filters.ChoiceFilter(
        method='filter_session_type',
        choices=[
            ('online', 'Только онлайн'),
            ('offline', 'Только офлайн'),
            ('both', 'Оба типа'),
            ('none', 'Без сессий')
        ]
    )
    
    class Meta:
        model = Event
        fields = ['status', 'is_active', 'owner']
    
    def filter_search(self, queryset, name, value):
        """Поиск по названию и описанию"""
        return queryset.filter(
            Q(name__icontains=value) |
            Q(description__icontains=value)
        )
    
    def filter_has_online_sessions(self, queryset, name, value):
        """Фильтр по наличию онлайн сессий"""
        if value:
            return queryset.filter(online_sessions__isnull=False).distinct()
        return queryset.filter(online_sessions__isnull=True)
    
    def filter_has_offline_sessions(self, queryset, name, value):
        """Фильтр по наличию офлайн сессий"""
        if value:
            return queryset.filter(offline_sessions__isnull=False).distinct()
        return queryset.filter(offline_sessions__isnull=True)
    
    def filter_session_type(self, queryset, name, value):
        """Фильтр по типу сессий"""
        if value == 'online':
            return queryset.filter(
                online_sessions__isnull=False,
                offline_sessions__isnull=True
            ).distinct()
        elif value == 'offline':
            return queryset.filter(
                online_sessions__isnull=True,
                offline_sessions__isnull=False
            ).distinct()
        elif value == 'both':
            return queryset.filter(
                online_sessions__isnull=False,
                offline_sessions__isnull=False
            ).distinct()
        elif value == 'none':
            return queryset.filter(
                online_sessions__isnull=True,
                offline_sessions__isnull=True
            )
        return queryset


class OnlineEventInfoFilter(django_filters.FilterSet):
    """Фильтры для онлайн-сессий"""
    status = django_filters.ChoiceFilter(choices=OnlineEventInfo.STATUS_CHOICES)
    platform = django_filters.ChoiceFilter(choices=OnlineEventInfo.PLATFORM_CHOICES)
    is_active = django_filters.BooleanFilter()
    event = django_filters.NumberFilter(field_name='event__id')
    start_after = django_filters.DateTimeFilter(field_name='start_time', lookup_expr='gte')
    start_before = django_filters.DateTimeFilter(field_name='start_time', lookup_expr='lte')
    
    class Meta:
        model = OnlineEventInfo
        fields = ['status', 'platform', 'is_active', 'event']


# ====================
# ViewSets
# ====================

class EventViewSet(viewsets.ModelViewSet):
    """ViewSet для управления событиями"""
    queryset = Event.objects.all()
    pagination_class = EventPagination  # Пагинация для основного списка
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = EventFilter
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'closes_at', 'name', 'updated_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EventDetailSerializer
        elif self.action == 'participating':
            return EventWithParticipationSerializer
        return EventSerializer
    
    def get_permissions(self):
        """Определяем permissions в зависимости от действия"""
        if self.action in ['create']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
        elif self.action in ['join', 'leave']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.AllowAny]  # Разрешаем всем доступ к чтению
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Возвращаем queryset в зависимости от пользователя"""
        print(f"🔄 get_queryset вызван для URL: {self.request.path}")
        print(f"👤 Пользователь: {self.request.user}")
        print(f"🔑 Аутентифицирован: {self.request.user.is_authenticated}")
        
        queryset = super().get_queryset()
        user = self.request.user
        
        # Оптимизация запросов
        queryset = queryset.prefetch_related(
            'online_sessions',
            'offline_sessions',
            'event_participants'
        ).select_related('owner')
        
        if user.is_authenticated:
            if user.is_staff or user.is_superuser:
                print("🎯 Режим: администратор - ВСЕ события (включая приватные)")
                return queryset
            
            # Аннотируем, участвует ли пользователь в событии
            participations = EventParticipant.objects.filter(
                event=OuterRef('pk'),
                user=user,
                is_confirmed=True
            )
            queryset = queryset.annotate(is_participant=Exists(participations))
            
            # Пользователи видят:
            # 1. Свои события (владелец)
            # 2. Публичные события (status='published', is_active=True, is_private=False)
            # 3. Приватные события, в которых они участвуют
            queryset = queryset.filter(
                # Владелец события (видит все свои события, включая приватные)
                Q(owner=user) |
                # Публичные опубликованные события
                Q(status='published', is_active=True, is_private=False) |
                # Приватные события, в которых пользователь участвует
                Q(is_private=True, is_participant=True)
            )
            
            print(f"📊 Пользователь видит {queryset.count()} событий")
            return queryset
        
        # Неаутентифицированные пользователи видят только публичные опубликованные события
        print("🎯 Режим: аноним - только публичные опубликованные события")
        return queryset.filter(
            status='published', 
            is_active=True, 
            is_private=False
        )
    
    def perform_create(self, serializer):
        """При создании события автоматически устанавливаем владельца"""
        serializer.save(owner=self.request.user)
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Присоединиться к событию"""
        event = self.get_object()
        user = request.user
        
        # Проверяем, можно ли присоединиться
        if not event.is_active or event.status != 'published':
            return Response(
                {'detail': 'Событие не активно или не опубликовано'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if event.closes_at and timezone.now() > event.closes_at:
            return Response(
                {'detail': 'Регистрация на событие закрыта'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, не является ли пользователь уже участником
        if EventParticipant.objects.filter(event=event, user=user).exists():
            return Response(
                {'detail': 'Вы уже являетесь участником этого события'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаем запись участника
        participant = EventParticipant.objects.create(
            event=event,
            user=user,
            role='participant',
            is_confirmed=True
        )
        
        serializer = EventParticipantSerializer(participant)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Покинуть событие"""
        event = self.get_object()
        user = request.user
        
        try:
            participant = EventParticipant.objects.get(event=event, user=user)
            participant.delete()
            return Response({'detail': 'Вы покинули событие'}, status=status.HTTP_200_OK)
        except EventParticipant.DoesNotExist:
            return Response(
                {'detail': 'Вы не являетесь участником этого события'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def my_events(self, request):
        """Получить события текущего пользователя (БЕЗ ПАГИНАЦИИ)"""
        events = self.get_queryset().filter(owner=request.user)
        serializer = self.get_serializer(events, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def participating(self, request):
        """Получить события, в которых участвует пользователь (БЕЗ ПАГИНАЦИИ)"""
        event_ids = EventParticipant.objects.filter(
            user=request.user,
            is_confirmed=True
        ).values_list('event_id', flat=True)
        
        queryset = self.get_queryset().filter(id__in=event_ids)
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Предстоящие события (БЕЗ ПАГИНАЦИИ)"""
        events = self.get_queryset().filter(
            status='published',
            is_active=True,
            closes_at__gt=timezone.now()
        )
        serializer = self.get_serializer(events, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        """Получить участников события (БЕЗ ПАГИНАЦИИ)"""
        event = self.get_object()
        participants = event.event_participants.filter(is_confirmed=True)
        serializer = EventParticipantSerializer(participants, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def online_sessions(self, request, pk=None):
        """Получить все онлайн сессии события (БЕЗ ПАГИНАЦИИ)"""
        event = self.get_object()
        sessions = event.online_sessions.filter(is_active=True)
        serializer = OnlineEventInfoSerializer(sessions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def offline_sessions(self, request, pk=None):
        """Получить все офлайн сессии события (БЕЗ ПАГИНАЦИИ)"""
        event = self.get_object()
        sessions = event.offline_sessions.filter(is_active=True)
        serializer = OfflineSessionsInfoSerializer(sessions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def upcoming_sessions(self, request, pk=None):
        """Получить предстоящие сессии события (БЕЗ ПАГИНАЦИИ)"""
        event = self.get_object()
        
        online_sessions = event.online_sessions.filter(
            is_active=True,
            status='scheduled',
            start_time__gt=timezone.now()
        )
        
        offline_sessions = event.offline_sessions.filter(
            is_active=True,
            status='scheduled',
            start_time__gt=timezone.now()
        )
        
        return Response({
            'online_sessions': OnlineEventInfoSerializer(online_sessions, many=True, context={'request': request}).data,
            'offline_sessions': OfflineSessionsInfoSerializer(offline_sessions, many=True, context={'request': request}).data,
            'total_upcoming': online_sessions.count() + offline_sessions.count()
        })
    
    @action(detail=True, methods=['get'])
    def session_stats(self, request, pk=None):
        """Получить статистику по сессиям события"""
        event = self.get_object()
        
        online_stats = {
            'total': event.online_sessions.count(),
            'active': event.online_sessions.filter(is_active=True).count(),
            'upcoming': event.online_sessions.filter(
                is_active=True,
                status='scheduled',
                start_time__gt=timezone.now()
            ).count(),
            'ongoing': event.online_sessions.filter(
                is_active=True,
                status='ongoing'
            ).count(),
            'completed': event.online_sessions.filter(
                is_active=True,
                status='completed'
            ).count(),
        }
        
        offline_stats = {
            'total': event.offline_sessions.count(),
            'active': event.offline_sessions.filter(is_active=True).count(),
            'upcoming': event.offline_sessions.filter(
                is_active=True,
                status='scheduled',
                start_time__gt=timezone.now()
            ).count(),
            'ongoing': event.offline_sessions.filter(
                is_active=True,
                status='ongoing'
            ).count(),
            'completed': event.offline_sessions.filter(
                is_active=True,
                status='completed'
            ).count(),
        }
        
        return Response({
            'online': online_stats,
            'offline': offline_stats,
            'has_online_sessions': event.has_online_sessions,
            'has_offline_sessions': event.has_offline_sessions,
        })


class EventParticipantViewSet(viewsets.ModelViewSet):
    """ViewSet для управления участниками событий"""
    queryset = EventParticipant.objects.all()
    serializer_class = EventParticipantSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['event', 'user', 'role', 'is_confirmed']
    ordering_fields = ['registered_at']
    ordering = ['-registered_at']

    def get_permissions(self):
        """Определяем permissions в зависимости от действия"""
        if self.action in ['create']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsEventOwnerOrAdmin]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """Возвращаем queryset в зависимости от пользователя"""
        queryset = super().get_queryset()
        user = self.request.user

        # Получаем event_id из URL параметра для фильтрации
        event_id = self.kwargs.get('event_id')
        if event_id:
            queryset = queryset.filter(event_id=event_id)

        if user.is_authenticated:
            if user.is_staff or user.is_superuser:
                return queryset
            # Пользователи видят участников своих событий или свои участия
            return queryset.filter(
                Q(event__owner=user) |
                Q(user=user)
            )
        return queryset.none()

    def perform_create(self, serializer):
        """Создание участника и отправка уведомления"""
        participant = serializer.save()

        # Создаем уведомление для пользователя
        Notification.objects.create(
            user=participant.user,
            title=f'Приглашение на событие: {participant.event.name}',
            text=f'Организатор добавил вас в качестве {participant.get_role_display()} на событие "{participant.event.name}". Подтвердите свое участие.',
        )

        # Сохраняем participant_id в тексте чтобы можно было извлечь
        notification = Notification.objects.filter(
            user=participant.user,
            title__icontains=participant.event.name
        ).order_by('-created_at').first()

        if notification:
            # Добавляем participant_id в конец текста
            notification.text = f'{notification.text} [participant_id:{participant.id}]'
            notification.save()

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Подтвердить участие в событии"""
        participant = self.get_object()
        
        # Проверяем что пользователь это тот кто был приглашен
        if participant.user != request.user:
            return Response(
                {'detail': 'Вы не можете подтвердить это приглашение'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        participant.is_confirmed = True
        participant.save()
        
        # Удаляем уведомление или помечаем как прочитанное
        Notification.objects.filter(
            user=request.user,
            title__icontains=participant.event.name
        ).update(is_read=True)
        
        return Response({'detail': 'Вы подтвердили участие в событии'})

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Отклонить приглашение"""
        participant = self.get_object()
        
        # Проверяем что пользователь это тот кто был приглашен
        if participant.user != request.user:
            return Response(
                {'detail': 'Вы не можете отклонить это приглашение'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Помечаем уведомление как прочитанное
        Notification.objects.filter(
            user=request.user,
            title__icontains=participant.event.name
        ).update(is_read=True)
        
        # Удаляем участника
        participant.delete()
        
        return Response({'detail': 'Вы отклонили приглашение'})


class OnlineEventInfoViewSet(viewsets.ModelViewSet):
    """ViewSet для управления онлайн-сессиями"""
    queryset = OnlineEventInfo.objects.all()
    pagination_class = EventPagination  # Пагинация для основного списка
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = OnlineEventInfoFilter
    search_fields = ['session_name', 'session_notes']
    ordering_fields = ['start_time', 'created_at', 'session_name']
    ordering = ['start_time']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OnlineEventInfoDetailSerializer
        return OnlineEventInfoSerializer
    
    def get_permissions(self):
        """Определяем permissions в зависимости от действия"""
        if self.action in ['create']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsEventOwnerOrAdmin]
        elif self.action in ['join', 'leave', 'register']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.AllowAny]  # Разрешаем всем доступ к чтению
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Возвращаем queryset в зависимости от пользователя"""
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_authenticated:
            if user.is_staff or user.is_superuser:
                return queryset
            # Пользователи видят сессии своих событий или опубликованных событий
            return queryset.filter(
                Q(event__owner=user) |
                Q(event__status='published', event__is_active=True, is_active=True)
            )
        # Неаутентифицированные пользователи видят только сессии опубликованных событий
        return queryset.filter(event__status='published', event__is_active=True, is_active=True)
    
    def perform_create(self, serializer):
        """Проверяем, что пользователь является владельцем события"""
        event = serializer.validated_data['event']
        if event.owner != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied(
                'Вы не являетесь владельцем этого события'
            )
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Присоединиться к онлайн-сессии"""
        session = self.get_object()
        user = request.user
        
        # Проверяем, можно ли присоединиться
        if not session.is_active or session.status == 'cancelled':
            return Response(
                {'detail': 'Сессия не активна или отменена'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if session.is_past:
            return Response(
                {'detail': 'Сессия уже завершилась'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, является ли пользователь участником события
        if not EventParticipant.objects.filter(event=session.event, user=user, is_confirmed=True).exists():
            return Response(
                {'detail': 'Вы не являетесь участником этого события'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем лимит участников
        if session.max_participants:
            current_participants = SessionAttendance.objects.filter(
                session=session,
                status__in=['registered', 'joined']
            ).count()
            if current_participants >= session.max_participants:
                return Response(
                    {'detail': 'Достигнут лимит участников'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Создаем или обновляем запись о посещении
        attendance, created = SessionAttendance.objects.get_or_create(
            session=session,
            participant=user,
            defaults={'status': 'joined' if session.is_ongoing else 'registered'}
        )
        
        if not created and attendance.status == 'registered' and session.is_ongoing:
            attendance.status = 'joined'
            attendance.save()
        
        serializer = SessionAttendanceSerializer(attendance, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Выйти из онлайн-сессии"""
        session = self.get_object()
        user = request.user
        
        try:
            attendance = SessionAttendance.objects.get(session=session, participant=user)
            attendance.status = 'left'
            attendance.left_at = timezone.now()
            attendance.update_duration()
            attendance.save()
            
            return Response({'detail': 'Вы вышли из сессии'}, status=status.HTTP_200_OK)
        except SessionAttendance.DoesNotExist:
            return Response(
                {'detail': 'Вы не зарегистрированы на эту сессию'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Предстоящие онлайн-сессии (БЕЗ ПАГИНАЦИИ)"""
        sessions = self.get_queryset().filter(
            is_active=True,
            status='scheduled',
            start_time__gt=timezone.now()
        )
        serializer = self.get_serializer(sessions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def ongoing(self, request):
        """Текущие онлайн-сессии (БЕЗ ПАГИНАЦИИ)"""
        sessions = self.get_queryset().filter(
            is_active=True,
            status='ongoing'
        )
        serializer = self.get_serializer(sessions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def attendances(self, request, pk=None):
        """Получить список посещаемости сессии (БЕЗ ПАГИНАЦИИ)"""
        session = self.get_object()
        attendances = session.attendances.all()
        serializer = SessionAttendanceSerializer(attendances, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def materials(self, request, pk=None):
        """Получить материалы сессии (БЕЗ ПАГИНАЦИИ)"""
        session = self.get_object()
        materials = session.materials.filter(is_public=True)
        serializer = SessionMaterialSerializer(materials, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def event_info(self, request, pk=None):
        """Получить информацию о событии, к которому относится сессия"""
        session = self.get_object()
        event = session.event
        serializer = EventSerializer(event, context={'request': request})
        return Response(serializer.data)


class SessionAttendanceViewSet(viewsets.ModelViewSet):
    """ViewSet для управления посещаемостью сессий"""
    queryset = SessionAttendance.objects.all()
    serializer_class = SessionAttendanceSerializer
    pagination_class = EventPagination  # Пагинация для основного списка
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['session', 'participant', 'status']
    ordering_fields = ['joined_at', 'left_at']
    ordering = ['-joined_at']
    
    def get_permissions(self):
        """Определяем permissions в зависимости от действия"""
        if self.action in ['create']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsSessionOwnerOrAdmin]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        """При создании автоматически устанавливаем участника"""
        serializer.save(participant=self.request.user)
    
    def get_queryset(self):
        """Возвращаем queryset в зависимости от пользователя"""
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_authenticated:
            if user.is_staff or user.is_superuser:
                return queryset
            # Пользователи видят свои посещения или посещения сессий своих событий
            return queryset.filter(
                Q(participant=user) |
                Q(session__event__owner=user)
            )
        return queryset.none()
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Завершить посещение сессии"""
        attendance = self.get_object()
        
        if attendance.participant != request.user:
            return Response(
                {'detail': 'Вы не являетесь участником этой сессии'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        attendance.status = 'completed'
        if not attendance.left_at:
            attendance.left_at = timezone.now()
        attendance.update_duration()
        attendance.save()
        
        serializer = self.get_serializer(attendance, context={'request': request})
        return Response(serializer.data)


class SessionMaterialViewSet(viewsets.ModelViewSet):
    """ViewSet для управления материалами сессий"""
    queryset = SessionMaterial.objects.all()
    serializer_class = SessionMaterialSerializer
    pagination_class = EventPagination  # Пагинация для основного списка
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['session', 'material_type', 'is_public', 'uploaded_by']
    search_fields = ['title', 'description']
    ordering_fields = ['uploaded_at', 'title']
    ordering = ['-uploaded_at']
    
    def get_permissions(self):
        """Определяем permissions в зависимости от действия"""
        if self.action in ['create']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsSessionOwnerOrAdmin]
        else:
            permission_classes = [permissions.AllowAny]  # Разрешаем всем доступ к чтению
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        """При создании автоматически устанавливаем загрузившего"""
        serializer.save(uploaded_by=self.request.user)
    
    def get_queryset(self):
        """Возвращаем queryset в зависимости от пользователя"""
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_authenticated:
            if user.is_staff or user.is_superuser:
                return queryset
            # Пользователи видят публичные материалы или материалы своих сессий
            return queryset.filter(
                Q(is_public=True) |
                Q(session__event__owner=user) |
                Q(uploaded_by=user)
            )
        # Неаутентифицированные пользователи видят только публичные материалы
        return queryset.filter(is_public=True)


class OfflineSessionsInfoViewSet(viewsets.ModelViewSet):
    """ViewSet для управления оффлайн-сессиями"""
    queryset = OfflineSessionsInfo.objects.all()
    serializer_class = OfflineSessionsInfoSerializer
    pagination_class = EventPagination  # Пагинация для основного списка
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['event', 'status', 'is_active']
    search_fields = ['session_name', 'session_notes', 'address', 'room']
    ordering_fields = ['start_time', 'created_at', 'session_name']
    ordering = ['start_time']
    
    def get_permissions(self):
        """Определяем permissions в зависимости от действия"""
        if self.action in ['create']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsEventOwnerOrAdmin]
        else:
            permission_classes = [permissions.AllowAny]  # Разрешаем всем доступ к чтению
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        """Проверяем, что пользователь является владельцем события"""
        event = serializer.validated_data['event']
        if event.owner != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied(
                'Вы не являетесь владельцем этого события'
            )
        serializer.save()
    
    def get_queryset(self):
        """Возвращаем queryset в зависимости от пользователя"""
        queryset = super().get_queryset()
        user = self.request.user

        # Получаем event_id из query параметров для фильтрации
        event_id = self.request.query_params.get('event')
        if event_id:
            queryset = queryset.filter(event_id=event_id)

        if user.is_authenticated:
            if user.is_staff or user.is_superuser:
                return queryset
            # Пользователи видят сессии своих событий или опубликованных событий
            return queryset.filter(
                Q(event__owner=user) |
                Q(event__status='published', event__is_active=True, is_active=True)
            )
        # Неаутентифицированные пользователи видят только сессии опубликованных событий
        return queryset.filter(event__status='published', event__is_active=True, is_active=True)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Предстоящие оффлайн-сессии (БЕЗ ПАГИНАЦИИ)"""
        sessions = self.get_queryset().filter(
            is_active=True,
            status='scheduled',
            start_time__gt=timezone.now()
        )
        serializer = self.get_serializer(sessions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def event_info(self, request, pk=None):
        """Получить информацию о событии, к которому относится сессия"""
        session = self.get_object()
        event = session.event
        serializer = EventSerializer(event, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def location_info(self, request, pk=None):
        """Получить детальную информацию о месте проведения"""
        session = self.get_object()
        return Response({
            'address': session.address,
            'room': session.room,
            'full_location': session.full_location,
            'coordinates': session.coordinates if hasattr(session, 'coordinates') else None,
            'additional_info': session.additional_location_info if hasattr(session, 'additional_location_info') else None,
        })