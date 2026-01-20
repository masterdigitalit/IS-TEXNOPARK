from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StatisticsViewSet, ParticipantStatisticsAPIView

router = DefaultRouter()
router.register(r'statistics', StatisticsViewSet, basename='statistics')

urlpatterns = [
    path('', include(router.urls)),
    path(
        'participant/overall/', 
        ParticipantStatisticsAPIView.as_view(), 
        name='participant-overall-stats'
    ),
]