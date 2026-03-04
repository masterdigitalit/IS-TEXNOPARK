# events/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

urlpatterns = [
    # Участники событий (должно быть ВЫШЕ чем events/<int:pk>/participants/)
    path('events/<int:event_id>/participants/', views.EventParticipantViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='event-participants-list'),
    path('events/<int:event_id>/participants/<int:pk>/', views.EventParticipantViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='event-participant-detail'),
    path('events/participants/<int:pk>/accept/', views.EventParticipantViewSet.as_view({'post': 'accept'}), name='event-participant-accept'),
    path('events/participants/<int:pk>/decline/', views.EventParticipantViewSet.as_view({'post': 'decline'}), name='event-participant-decline'),

    # Основные пути для событий
    path('events/all/', views.EventViewSet.as_view({'get': 'list'}), name='events-all'),
    path('events/', views.EventViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='events-list-create'),

    path('events/<int:pk>/', views.EventViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='events-detail'),

    # ... остальные ваши пути без изменений
    path('events/<int:pk>/join/', views.EventViewSet.as_view({'post': 'join'}), name='event-join'),
    path('events/<int:pk>/leave/', views.EventViewSet.as_view({'post': 'leave'}), name='event-leave'),
    path('events/<int:pk>/participants/', views.EventViewSet.as_view({'get': 'participants'}), name='event-participants'),
    path('events/my/', views.EventViewSet.as_view({'get': 'my_events'}), name='my-events'),
    path('events/participating/', views.EventViewSet.as_view({'get': 'participating'}), name='participating-events'),
    path('events/upcoming/', views.EventViewSet.as_view({'get': 'upcoming'}), name='upcoming-events'),

    # Онлайн-сессии
    path('online-sessions/', views.OnlineEventInfoViewSet.as_view({'get': 'list', 'post': 'create'}), name='online-sessions-list'),
    path('online-sessions/<int:pk>/', views.OnlineEventInfoViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='online-sessions-detail'),
    path('events/online-sessions/<int:pk>/join/', views.OnlineEventInfoViewSet.as_view({'post': 'join'}), name='session-join'),
    path('events/online-sessions/<int:pk>/leave/', views.OnlineEventInfoViewSet.as_view({'post': 'leave'}), name='session-leave'),
    path('events/online-sessions/<int:pk>/attendances/', views.OnlineEventInfoViewSet.as_view({'get': 'attendances'}), name='session-attendances'),
    path('events/online-sessions/<int:pk>/materials/', views.OnlineEventInfoViewSet.as_view({'get': 'materials'}), name='session-materials'),
    path('events/online-sessions/upcoming/', views.OnlineEventInfoViewSet.as_view({'get': 'upcoming'}), name='upcoming-sessions'),
    path('events/online-sessions/ongoing/', views.OnlineEventInfoViewSet.as_view({'get': 'ongoing'}), name='ongoing-sessions'),

    # Оффлайн-сессии
    path('offline-sessions/', views.OfflineSessionsInfoViewSet.as_view({'get': 'list', 'post': 'create'}), name='offline-sessions-list'),
    path('offline-sessions/<int:pk>/', views.OfflineSessionsInfoViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='offline-sessions-detail'),
    path('events/offline-sessions/upcoming/', views.OfflineSessionsInfoViewSet.as_view({'get': 'upcoming'}), name='upcoming-offline-sessions'),

    # Участники событий
    path('events/<int:event_id>/participants/', views.EventParticipantViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='event-participants-list'),
    path('events/<int:event_id>/participants/<int:pk>/', views.EventParticipantViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='event-participant-detail'),
    path('events/participants/<int:pk>/accept/', views.EventParticipantViewSet.as_view({'post': 'accept'}), name='event-participant-accept'),
    path('events/participants/<int:pk>/decline/', views.EventParticipantViewSet.as_view({'post': 'decline'}), name='event-participant-decline'),

    path('events/session-attendances/<int:pk>/complete/', views.SessionAttendanceViewSet.as_view({'post': 'complete'}), name='attendance-complete'),
]