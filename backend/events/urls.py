# events/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

# Регистрируем все ViewSets
router.register(r'events', views.EventViewSet, basename='event')
router.register(r'event-participants', views.EventParticipantViewSet, basename='eventparticipant')
router.register(r'online-sessions', views.OnlineEventInfoViewSet, basename='onlineeventinfo')
router.register(r'offline-sessions', views.OfflineSessionsInfoViewSet, basename='offlinesessionsinfo')
router.register(r'session-attendances', views.SessionAttendanceViewSet, basename='sessionattendance')
router.register(r'session-materials', views.SessionMaterialViewSet, basename='sessionmaterial')

urlpatterns = [
    path('', include(router.urls)),
    
    # Дополнительные endpoints для удобства
    path('events/events/<int:pk>/join/', views.EventViewSet.as_view({'post': 'join'}), name='event-join'),
    path('events/events/<int:pk>/leave/', views.EventViewSet.as_view({'post': 'leave'}), name='event-leave'),
    path('events/events/<int:pk>/participants/', views.EventViewSet.as_view({'get': 'participants'}), name='event-participants'),
    path('events/events/my/', views.EventViewSet.as_view({'get': 'my_events'}), name='my-events'),
    path('events/events/participating/', views.EventViewSet.as_view({'get': 'participating'}), name='participating-events'),
    path('events/events/upcoming/', views.EventViewSet.as_view({'get': 'upcoming'}), name='upcoming-events'),
    
    path('events/online-sessions/<int:pk>/join/', views.OnlineEventInfoViewSet.as_view({'post': 'join'}), name='session-join'),
    path('events/online-sessions/<int:pk>/leave/', views.OnlineEventInfoViewSet.as_view({'post': 'leave'}), name='session-leave'),
    path('events/online-sessions/<int:pk>/attendances/', views.OnlineEventInfoViewSet.as_view({'get': 'attendances'}), name='session-attendances'),
    path('events/online-sessions/<int:pk>/materials/', views.OnlineEventInfoViewSet.as_view({'get': 'materials'}), name='session-materials'),
    path('events/online-sessions/upcoming/', views.OnlineEventInfoViewSet.as_view({'get': 'upcoming'}), name='upcoming-sessions'),
    path('events/online-sessions/ongoing/', views.OnlineEventInfoViewSet.as_view({'get': 'ongoing'}), name='ongoing-sessions'),
    
    path('events/offline-sessions/upcoming/', views.OfflineSessionsInfoViewSet.as_view({'get': 'upcoming'}), name='upcoming-offline-sessions'),
    
    path('events/session-attendances/<int:pk>/complete/', views.SessionAttendanceViewSet.as_view({'post': 'complete'}), name='attendance-complete'),
]