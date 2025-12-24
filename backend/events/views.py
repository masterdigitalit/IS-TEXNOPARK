# events/views.py
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Exists, OuterRef
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import (
    Event, EventParticipant, OnlineEventInfo, 
    SessionAttendance, SessionMaterial, OfflineSessionsInfo
)
from .serializers import (
    EventSerializer, EventDetailSerializer, EventParticipantSerializer,
    OnlineEventInfoSerializer, OnlineEventInfoDetailSerializer,
    SessionAttendanceSerializer, SessionMaterialSerializer,
    OfflineSessionsInfoSerializer, UserSimpleSerializer,
    EventWithParticipationSerializer  # Добавили новый сериализатор
)

User = get_user_model()


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
    
    # Новые фильтры
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
                return queryset
            
            # Аннотируем, участвует ли пользователь в событии
            participations = EventParticipant.objects.filter(
                event=OuterRef('pk'),
                user=user,
                is_confirmed=True
            )
            queryset = queryset.annotate(is_participant=Exists(participations))
            
            # Пользователи видят свои события, опубликованные и события, в которых участвуют
            return queryset.filter(
                Q(owner=user) | 
                Q(status='published', is_active=True) |
                Q(is_participant=True)
            )
        
        # Неаутентифицированные пользователи видят только опубликованные
        return queryset.filter(status='published', is_active=True)
    
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
        """Получить события текущего пользователя"""
        events = self.get_queryset().filter(owner=request.user)
        page = self.paginate_queryset(events)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(events, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def participating(self, request):
        """Получить события, в которых участвует пользователь"""
        # Получаем ID событий, в которых пользователь участвует
        event_ids = EventParticipant.objects.filter(
            user=request.user,
            is_confirmed=True
        ).values_list('event_id', flat=True)
        
        # Получаем события
        queryset = self.get_queryset().filter(id__in=event_ids)
        
        # Пагинация
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Предстоящие события"""
        events = self.get_queryset().filter(
            status='published',
            is_active=True,
            closes_at__gt=timezone.now()
        )
        page = self.paginate_queryset(events)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(events, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        """Получить участников события"""
        event = self.get_object()
        participants = event.event_participants.filter(is_confirmed=True)
        serializer = EventParticipantSerializer(participants, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def online_sessions(self, request, pk=None):
        """Получить все онлайн сессии события"""
        event = self.get_object()
        sessions = event.online_sessions.filter(is_active=True)
        serializer = OnlineEventInfoSerializer(sessions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def offline_sessions(self, request, pk=None):
        """Получить все офлайн сессии события"""
        event = self.get_object()
        sessions = event.offline_sessions.filter(is_active=True)
        serializer = OfflineSessionsInfoSerializer(sessions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def upcoming_sessions(self, request, pk=None):
        """Получить предстоящие сессии события"""
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
        
        if user.is_authenticated:
            if user.is_staff or user.is_superuser:
                return queryset
            # Пользователи видят участников своих событий или свои участия
            return queryset.filter(
                Q(event__owner=user) |
                Q(user=user)
            )
        return queryset.none()


class OnlineEventInfoViewSet(viewsets.ModelViewSet):
    """ViewSet для управления онлайн-сессиями"""
    queryset = OnlineEventInfo.objects.all()
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
        """Предстоящие онлайн-сессии"""
        sessions = self.get_queryset().filter(
            is_active=True,
            status='scheduled',
            start_time__gt=timezone.now()
        )
        serializer = self.get_serializer(sessions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def ongoing(self, request):
        """Текущие онлайн-сессии"""
        sessions = self.get_queryset().filter(
            is_active=True,
            status='ongoing'
        )
        serializer = self.get_serializer(sessions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def attendances(self, request, pk=None):
        """Получить список посещаемости сессии"""
        session = self.get_object()
        attendances = session.attendances.all()
        serializer = SessionAttendanceSerializer(attendances, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def materials(self, request, pk=None):
        """Получить материалы сессии"""
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
        """Предстоящие оффлайн-сессии"""
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