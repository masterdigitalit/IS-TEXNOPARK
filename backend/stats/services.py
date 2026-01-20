# app_stats/services.py
from datetime import timedelta
from typing import Dict, Any, List
from django.utils import timezone
from django.core.cache import cache
from events.models import Event, EventParticipant
from .models import (
    CachedStatistic, ProjectWork, Evaluation,
    EvaluationCriteria, JudgeWeight, StatisticSnapshot
)
from .calculators import (
    WeightedAverageCalculator, TrendCalculator,
    ConsensusCalculator, EngagementCalculator
)


class StatisticsService:
    """
    Основной сервис для работы со статистикой.
    """
    
    CACHE_DURATION = 3600  # 1 час в секундах
    
    @classmethod
    def get_event_summary(cls, event_id: int, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Получает сводную статистику по мероприятию.
        """
        cache_key = f'event_summary_{event_id}'
        
        # Проверяем кэш
        if not force_refresh:
            cached = cache.get(cache_key)
            if cached:
                return cached
            
            # Проверяем кэш в БД
            try:
                db_cached = CachedStatistic.objects.get(
                    event_id=event_id,
                    statistic_type='event_summary'
                )
                if not db_cached.is_expired():
                    cache.set(cache_key, db_cached.data, cls.CACHE_DURATION)
                    return db_cached.data
            except CachedStatistic.DoesNotExist:
                pass
        
        # Рассчитываем статистику
        summary = cls._calculate_event_summary(event_id)
        
        # Кэшируем
        cache.set(cache_key, summary, cls.CACHE_DURATION)
        
        # Сохраняем в БД
        cls._save_to_db_cache(event_id, 'event_summary', summary)
        
        return summary
    
    @classmethod
    def _calculate_event_summary(cls, event_id: int) -> Dict[str, Any]:
        """
        Рассчитывает сводную статистику мероприятия.
        """
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return {'error': 'Мероприятие не найдено'}
        
        # Базовая информация
        base_info = {
            'event_id': event.id,
            'event_name': event.name,
            'event_status': event.status,
            'current_stage': event.current_stage,
            'progress_percentage': event.progress_percentage,
        }
        
        # Статистика участников
        participants = EventParticipant.objects.filter(event_id=event_id)
        participant_stats = {
            'total': participants.count(),
            'owners': participants.filter(role='owner').count(),
            'referees': participants.filter(role='referee').count(),
            'participants': participants.filter(role='participant').count(),
            'confirmed': participants.filter(is_confirmed=True).count()
        }
        
        # Статистика работ
        projects = ProjectWork.objects.filter(event_id=event_id)
        project_stats = {
            'total': projects.count(),
            'published': projects.filter(is_published=True).count(),
            'evaluated': projects.filter(status='evaluated').count(),
            'under_review': projects.filter(status='under_review').count(),
        }
        
        # Статистика оценок
        evaluations = Evaluation.objects.filter(project__event_id=event_id, is_confirmed=True)
        evaluation_stats = {
            'total': evaluations.count(),
            'average_score': evaluations.aggregate(avg=Avg('score'))['avg'] or 0,
        }
        
        # Статистика по критериям
        criteria_stats = []
        for criteria in EvaluationCriteria.objects.filter(event_id=event_id, is_active=True):
            crit_evaluations = evaluations.filter(criteria=criteria)
            crit_avg = crit_evaluations.aggregate(avg=Avg('score'))['avg'] or 0
            criteria_stats.append({
                'id': criteria.id,
                'name': criteria.name,
                'max_score': criteria.max_score,
                'weight': criteria.weight,
                'evaluation_count': crit_evaluations.count(),
                'average_score': round(crit_avg, 2)
            })
        
        # Рейтинг работ
        project_rankings = []
        weighted_avg_calc = WeightedAverageCalculator()
        
        for project in projects.filter(is_published=True):
            project_result = weighted_avg_calc.calculate_for_project(project)
            
            project_rankings.append({
                'project_id': project.id,
                'title': project.title,
                'participant_email': project.participant.email,
                'weighted_average': project_result['final_weighted_average'],
                'evaluation_count': project_result['total_evaluations']
            })
        
        # Сортируем по убыванию среднего
        project_rankings.sort(key=lambda x: x['weighted_average'], reverse=True)
        
        # Добавляем места
        for i, project in enumerate(project_rankings, 1):
            project['rank'] = i
        
        # Рассчитываем метрики
        trend_calc = TrendCalculator()
        consensus_calc = ConsensusCalculator()
        
        return {
            **base_info,
            'participants': participant_stats,
            'projects': project_stats,
            'evaluations': evaluation_stats,
            'criteria': criteria_stats,
            'project_rankings': project_rankings[:10],  # Топ-10
            'metrics': {
                'trend': trend_calc.calculate_trend_for_event(event_id),
                'consensus': consensus_calc.calculate_for_event(event_id),
            },
            'calculated_at': timezone.now().isoformat()
        }
    
    @classmethod
    def get_participant_statistics(cls, user_id: int, event_id: int) -> Dict[str, Any]:
        """
        Получает статистику для конкретного участника.
        """
        cache_key = f'participant_stats_{event_id}_{user_id}'
        
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        result = cls._calculate_participant_stats(user_id, event_id)
        cache.set(cache_key, result, 1800)  # 30 минут
        
        return result
    
    @classmethod
    def _calculate_participant_stats(cls, user_id: int, event_id: int) -> Dict[str, Any]:
        """
        Рассчитывает статистику участника.
        """
        try:
            participant = EventParticipant.objects.get(
                user_id=user_id,
                event_id=event_id
            )
        except EventParticipant.DoesNotExist:
            return {'error': 'Участник не найден'}
        
        base_info = {
            'user_id': user_id,
            'email': participant.user.email,
            'role': participant.role,
            'registered_at': participant.registered_at,
            'is_confirmed': participant.is_confirmed
        }
        
        # В зависимости от роли
        if participant.role == 'participant':
            return cls._calculate_participant_as_participant(participant, base_info)
        elif participant.role == 'referee':
            return cls._calculate_participant_as_referee(participant, base_info)
        elif participant.role == 'owner':
            return cls._calculate_participant_as_owner(participant, base_info)
        
        return base_info
    
    @classmethod
    def _calculate_participant_as_participant(cls, participant: EventParticipant, base_info: Dict) -> Dict[str, Any]:
        """Статистика для участника."""
        user_id = participant.user_id
        event_id = participant.event_id
        
        try:
            project = ProjectWork.objects.get(
                participant_id=user_id,
                event_id=event_id
            )
        except ProjectWork.DoesNotExist:
            return {**base_info, 'project': None}
        
        # Рассчитываем статистику по проекту
        weighted_avg = WeightedAverageCalculator()
        project_stats = weighted_avg.calculate_for_project(project)
        
        # Находим место в рейтинге
        all_projects = ProjectWork.objects.filter(event_id=event_id, is_published=True)
        rankings = []
        
        for p in all_projects:
            stats = weighted_avg.calculate_for_project(p)
            if 'final_weighted_average' in stats:
                rankings.append({
                    'project_id': p.id,
                    'weighted_average': stats['final_weighted_average']
                })
        
        rankings.sort(key=lambda x: x['weighted_average'], reverse=True)
        
        # Находим место текущего проекта
        rank = None
        for i, r in enumerate(rankings, 1):
            if r['project_id'] == project.id:
                rank = i
                break
        
        # Получаем комментарии судей
        judge_comments = []
        evaluations = Evaluation.objects.filter(
            project=project,
            is_confirmed=True
        ).select_related('judge', 'criteria')
        
        for eval in evaluations:
            if eval.comment:
                judge_comments.append({
                    'judge_email': eval.judge.email,
                    'criteria': eval.criteria.name,
                    'score': eval.score,
                    'comment': eval.comment,
                    'evaluated_at': eval.evaluated_at
                })
        
        # Вовлеченность
        engagement_calc = EngagementCalculator()
        engagement = engagement_calc.calculate_for_participant(participant)
        
        return {
            **base_info,
            'project': {
                'id': project.id,
                'title': project.title,
                'status': project.status,
                'submitted_at': project.submitted_at,
                **project_stats
            },
            'ranking': {
                'rank': rank,
                'total_projects': len(rankings),
            },
            'judge_feedback': judge_comments,
            'engagement': engagement
        }
    
    @classmethod
    def _calculate_participant_as_referee(cls, participant: EventParticipant, base_info: Dict) -> Dict[str, Any]:
        """Статистика для судьи."""
        user_id = participant.user_id
        event_id = participant.event_id
        
        # Статистика оценок
        evaluations = Evaluation.objects.filter(
            judge_id=user_id,
            project__event_id=event_id
        )
        
        evaluation_stats = {
            'total': evaluations.count(),
            'confirmed': evaluations.filter(is_confirmed=True).count(),
            'average_score': evaluations.aggregate(avg=Avg('score'))['avg'] or 0,
        }
        
        # Консенсус судьи
        consensus_calc = ConsensusCalculator()
        consensus = consensus_calc.calculate_for_judge(user_id, event_id)
        
        # Вес судьи
        try:
            judge_weight = JudgeWeight.objects.get(
                event_id=event_id,
                judge_id=user_id
            ).weight
        except JudgeWeight.DoesNotExist:
            judge_weight = 1.0
        
        # Вовлеченность
        engagement_calc = EngagementCalculator()
        engagement = engagement_calc.calculate_for_participant(participant)
        
        return {
            **base_info,
            'evaluation_statistics': evaluation_stats,
            'consensus': consensus,
            'judge_weight': judge_weight,
            'engagement': engagement
        }
    
    @classmethod
    def _calculate_participant_as_owner(cls, participant: EventParticipant, base_info: Dict) -> Dict[str, Any]:
        """Статистика для владельца."""
        event_id = participant.event_id
        
        # Получаем полную сводку по мероприятию
        event_summary = cls.get_event_summary(event_id)
        
        return {
            **base_info,
            **event_summary
        }
    
    @classmethod
    def get_leaderboard(cls, event_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Получает текущий рейтинг работ.
        """
        cache_key = f'leaderboard_{event_id}_{limit}'
        
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        leaderboard = cls._calculate_leaderboard(event_id, limit)
        cache.set(cache_key, leaderboard, 300)  # 5 минут
        
        return leaderboard
    
    @classmethod
    def _calculate_leaderboard(cls, event_id: int, limit: int) -> List[Dict[str, Any]]:
        """
        Рассчитывает рейтинг работ.
        """
        projects = ProjectWork.objects.filter(
            event_id=event_id,
            is_published=True
        ).select_related('participant')
        
        weighted_avg = WeightedAverageCalculator()
        rankings = []
        
        for project in projects:
            stats = weighted_avg.calculate_for_project(project)
            
            if 'final_weighted_average' in stats:
                rankings.append({
                    'rank': 0,  # Заполнится позже
                    'project_id': project.id,
                    'title': project.title,
                    'participant_email': project.participant.email,
                    'participant_name': project.participant.get_full_name() or project.participant.username,
                    'weighted_average': stats['final_weighted_average'],
                    'evaluation_count': stats.get('total_evaluations', 0),
                    'submitted_at': project.submitted_at
                })
        
        # Сортируем по убыванию среднего балла
        rankings.sort(key=lambda x: x['weighted_average'], reverse=True)
        
        # Добавляем места
        for i, ranking in enumerate(rankings[:limit], 1):
            ranking['rank'] = i
        
        return rankings[:limit]
    
    @classmethod
    def _save_to_db_cache(cls, event_id: int, stat_type: str, data: Dict[str, Any]) -> None:
        """
        Сохраняет рассчитанные данные в кэш БД.
        """
        expires_at = timezone.now() + timedelta(hours=24)
        
        CachedStatistic.objects.update_or_create(
            event_id=event_id,
            statistic_type=stat_type,
            defaults={
                'data': data,
                'expires_at': expires_at
            }
        )
    
    @classmethod
    def take_snapshot(cls, event_id: int, snapshot_type: str = 'manual', notes: str = None) -> StatisticSnapshot:
        """
        Создает снимок статистики в текущий момент времени.
        """
        event_summary = cls.get_event_summary(event_id, force_refresh=True)
        
        snapshot = StatisticSnapshot.objects.create(
            event_id=event_id,
            snapshot_type=snapshot_type,
            data=event_summary,
            taken_at=timezone.now(),
            notes=notes
        )
        
        return snapshot
    
    @classmethod
    def invalidate_cache(cls, event_id: int = None, stat_type: str = None) -> int:
        """
        Инвалидирует кэш статистики.
        """
        # Очищаем кэш Django
        if event_id:
            # Удаляем ключи для этого мероприятия
            cache.delete(f'event_summary_{event_id}')
            cache.delete(f'participant_stats_{event_id}_*')
            cache.delete(f'leaderboard_{event_id}_*')
        else:
            # Очищаем весь кэш (осторожно!)
            cache.clear()
        
        # Очищаем кэш в БД
        query = CachedStatistic.objects.all()
        
        if event_id:
            query = query.filter(event_id=event_id)
        if stat_type:
            query = query.filter(statistic_type=stat_type)
        
        deleted_count, _ = query.delete()
        
        return deleted_count