# app_stats/apps.py
from django.apps import AppConfig


class AppStatsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'stats'
    verbose_name = 'Статистика и аналитика'