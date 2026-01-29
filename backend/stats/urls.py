from django.urls import path
from . import views

app_name = 'stats'

urlpatterns = [
    # Оценка участника судьей
    path('rate-participant/', views.RateParticipantView.as_view(), name='rate-participant'),

    # Список всех оценок для события
    path('event/<int:event_id>/ratings/', views.EventRatingsListView.as_view(), name='event-ratings-list'),

    # Список оценок для конкретного участника в событии
    path('event/<int:event_id>/participant/<int:participant_id>/ratings/', views.ParticipantRatingsListView.as_view(), name='participant-ratings-list'),

    # Детали статистики события
    path('event/<int:event_id>/statistics/', views.EventStatisticsDetailView.as_view(), name='event-statistics-detail'),

    # Ручной пересчет статистики события
    path('event/<int:event_id>/calculate-statistics/', views.calculate_event_statistics, name='calculate-event-statistics'),

    # Рейтинг участников события (лидерборд)
    path('event/<int:event_id>/leaderboard/', views.get_event_leaderboard, name='event-leaderboard'),

    # Статистика участников события
    path('event/<int:event_id>/participants/statistics/', views.get_event_participant_statistics, name='event-participant-statistics'),

    # Итоговая оценка конкретного участника
    path('event/<int:event_id>/participant/<int:participant_id>/final-score/', views.get_participant_final_score, name='participant-final-score'),

    # Статистика онлайн-сессии
    path('session/online/<int:session_id>/statistics/', views.get_online_session_statistics, name='online-session-statistics'),

    # Статистика оффлайн-сессии
    path('session/offline/<int:session_id>/statistics/', views.get_offline_session_statistics, name='offline-session-statistics'),

]