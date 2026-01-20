from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from .models import Event, JudgeWeight, CachedStatistic
from .calculators import WeightedAverageCalculator, ConsensusCalculator
from .services import StatisticsService
import logging

logger = logging.getLogger(__name__)


def recalculate_event_statistics(event_id: int) -> dict:
    """
    Синхронная версия пересчета статистики мероприятия.
    """
    try:
        StatisticsService.get_event_summary(event_id, force_refresh=True)
        logger.info(f"Статистика пересчитана для мероприятия {event_id}")
        return {'status': 'success', 'event_id': event_id}
    except Exception as e:
        logger.error(f"Ошибка пересчета статистики для {event_id}: {str(e)}")
        return {'status': 'error', 'event_id': event_id, 'error': str(e)}


def update_judge_weights(event_id: int) -> dict:
    """
    Синхронное обновление весов всех судей мероприятия.
    """
    from events.models import EventParticipant
    
    try:
        judges = EventParticipant.objects.filter(
            event_id=event_id,
            role='referee',
            is_confirmed=True
        )
        
        updated_count = 0
        calculator = WeightedAverageCalculator()
        
        for judge in judges:
            weight = calculator.calculate_judge_weight(judge.user_id, event_id)
            
            JudgeWeight.objects.update_or_create(
                event_id=event_id,
                judge_id=judge.user_id,
                defaults={
                    'weight': weight,
                    'calculation_method': 'consensus'
                }
            )
            
            updated_count += 1
        
        # Инвалидируем кэш статистики
        StatisticsService.invalidate_cache(event_id, 'event_summary')
        
        logger.info(f"Обновлены веса {updated_count} судей для мероприятия {event_id}")
        return {'status': 'success', 'updated_judges': updated_count}
    except Exception as e:
        logger.error(f"Ошибка обновления весов судей для {event_id}: {str(e)}")
        return {'status': 'error', 'error': str(e)}


def cleanup_old_statistics(days_old: int = 30) -> dict:
    """
    Синхронная очистка устаревших кэшированных статистик.
    """
    try:
        cutoff_date = timezone.now() - timedelta(days=days_old)
        
        deleted_count, _ = CachedStatistic.objects.filter(
            calculated_at__lt=cutoff_date
        ).delete()
        
        logger.info(f"Удалено {deleted_count} устаревших записей статистики")
        return {'status': 'success', 'deleted_count': deleted_count}
    except Exception as e:
        logger.error(f"Ошибка очистки статистики: {str(e)}")
        return {'status': 'error', 'error': str(e)}


def daily_statistics_snapshot() -> dict:
    """
    Синхронное создание ежедневных снимков статистики.
    """
    from events.models import Event
    
    try:
        active_events = Event.objects.filter(
            is_active=True,
            status__in=['published', 'completed']
        )
        
        created_count = 0
        
        for event in active_events:
            StatisticsService.take_snapshot(
                event.id,
                snapshot_type='daily',
                notes='Ежедневный автоматический снимок'
            )
            created_count += 1
        
        logger.info(f"Создано {created_count} ежедневных снимков статистики")
        return {'status': 'success', 'snapshots_created': created_count}
    except Exception as e:
        logger.error(f"Ошибка создания снимков: {str(e)}")
        return {'status': 'error', 'error': str(e)}


def process_new_evaluation(evaluation_id: int) -> dict:
    """
    Синхронная обработка новой оценки.
    """
    from .models import Evaluation
    
    try:
        evaluation = Evaluation.objects.get(id=evaluation_id)
        event_id = evaluation.project.event_id
        
        # Обновляем вес судьи (отложенно, не блокируем ответ)
        update_judge_weights(event_id)
        
        # Пересчитываем статистику мероприятия (отложенно)
        recalculate_event_statistics(event_id)
        
        logger.info(f"Обработана новая оценка {evaluation_id}")
        return {'status': 'success', 'evaluation_id': evaluation_id}
    except Evaluation.DoesNotExist:
        logger.error(f"Оценка {evaluation_id} не найдена")
        return {'status': 'error', 'message': 'Оценка не найдена'}
    except Exception as e:
        logger.error(f"Ошибка обработки оценки {evaluation_id}: {str(e)}")
        return {'status': 'error', 'error': str(e)}


def process_new_evaluation_async(evaluation_id: int):
    """
    Асинхронная обработка через threading (если нужна фоновая обработка без Celery).
    """
    import threading
    import time
    
    def background_task():
        """Фоновая задача с задержкой."""
        time.sleep(2)  # Небольшая задержка перед обработкой
        process_new_evaluation(evaluation_id)
    
    # Запускаем в отдельном потоке
    thread = threading.Thread(target=background_task, daemon=True)
    thread.start()
    
    return {'status': 'queued', 'evaluation_id': evaluation_id}


# Управление задачами через административный интерфейс
TASK_REGISTRY = {
    'recalculate_event_statistics': recalculate_event_statistics,
    'update_judge_weights': update_judge_weights,
    'cleanup_old_statistics': cleanup_old_statistics,
    'daily_statistics_snapshot': daily_statistics_snapshot,
    'process_new_evaluation': process_new_evaluation,
}


def execute_task(task_name: str, *args, **kwargs) -> dict:
    """
    Выполняет задачу по имени.
    """
    if task_name in TASK_REGISTRY:
        return TASK_REGISTRY[task_name](*args, **kwargs)
    else:
        return {'status': 'error', 'message': f'Задача {task_name} не найдена'}