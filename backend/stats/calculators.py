# app_stats/calculators.py
import math
import statistics
from typing import Dict, Any, List
from django.utils import timezone
from django.db.models import Avg, Count, Q
from events.models import Event, EventParticipant
from .models import ProjectWork, Evaluation, EvaluationCriteria, JudgeWeight


class WeightedAverageCalculator:
    """
    Калькулятор взвешенного среднего балла.
    """
    
    @staticmethod
    def calculate_for_project(project: ProjectWork) -> Dict[str, Any]:
        """
        Рассчитывает взвешенный средний балл для работы.
        """
        evaluations = Evaluation.objects.filter(
            project=project,
            is_confirmed=True
        ).select_related('judge', 'criteria')
        
        if not evaluations:
            return {
                'weighted_average': 0,
                'raw_average': 0,
                'total_score': 0,
                'criteria_count': 0,
                'judge_count': 0
            }
        
        # Получаем веса судей для этого мероприятия
        judge_weights = {}
        judges_ids = evaluations.values_list('judge_id', flat=True).distinct()
        
        for weight_obj in JudgeWeight.objects.filter(
            event=project.event,
            judge_id__in=judges_ids
        ):
            judge_weights[weight_obj.judge_id] = weight_obj.weight
        
        # Устанавливаем вес 1.0 по умолчанию для судей без веса
        for judge_id in judges_ids:
            if judge_id not in judge_weights:
                judge_weights[judge_id] = 1.0
        
        # Группируем оценки по критериям
        criteria_data = {}
        for eval in evaluations:
            criteria_id = eval.criteria_id
            
            if criteria_id not in criteria_data:
                criteria_data[criteria_id] = {
                    'name': eval.criteria.name,
                    'max_score': eval.criteria.max_score,
                    'weight': eval.criteria.weight,
                    'scores': []
                }
            
            # Применяем вес судья
            weighted_score = eval.score * judge_weights.get(eval.judge_id, 1.0)
            criteria_data[criteria_id]['scores'].append({
                'score': eval.score,
                'weighted_score': weighted_score,
                'judge_id': eval.judge_id,
                'judge_weight': judge_weights.get(eval.judge_id, 1.0),
                'comment': eval.comment
            })
        
        # Рассчитываем взвешенное среднее для каждого критерия
        results = []
        total_weighted_sum = 0
        total_weight_sum = 0
        
        for criteria_id, data in criteria_data.items():
            scores = [s['score'] for s in data['scores']]
            weighted_scores = [s['weighted_score'] for s in data['scores']]
            judge_weights_list = [s['judge_weight'] for s in data['scores']]
            
            # Взвешенное среднее для критерия
            if sum(judge_weights_list) > 0:
                weighted_avg = sum(weighted_scores) / sum(judge_weights_list)
            else:
                weighted_avg = statistics.mean(scores) if scores else 0
            
            # Сырое среднее (без весов)
            raw_avg = statistics.mean(scores) if scores else 0
            
            results.append({
                'criteria_id': criteria_id,
                'criteria_name': data['name'],
                'max_score': data['max_score'],
                'criteria_weight': data['weight'],
                'weighted_average': round(weighted_avg, 2),
                'raw_average': round(raw_avg, 2),
                'score_count': len(scores),
                'scores': scores
            })
            
            total_weighted_sum += weighted_avg * data['weight']
            total_weight_sum += data['weight']
        
        # Итоговое взвешенное среднее
        if total_weight_sum > 0:
            final_weighted_average = total_weighted_sum / total_weight_sum
        else:
            final_weighted_average = 0
        
        return {
            'project_id': project.id,
            'project_title': project.title,
            'final_weighted_average': round(final_weighted_average, 2),
            'criteria_details': results,
            'total_evaluations': evaluations.count(),
            'unique_judges': len(judges_ids),
            'calculated_at': timezone.now()
        }
    
    @staticmethod
    def calculate_judge_weight(judge_id: int, event_id: int) -> float:
        """
        Рассчитывает вес судьи на основе согласованности.
        """
        # Получаем все оценки судьи на этом мероприятии
        judge_evaluations = Evaluation.objects.filter(
            judge_id=judge_id,
            project__event_id=event_id,
            is_confirmed=True
        ).select_related('project')
        
        if not judge_evaluations:
            return 1.0  # Вес по умолчанию
        
        deviations = []
        
        for eval in judge_evaluations:
            # Находим среднюю оценку для этой работы (без учета этого судьи)
            other_evaluations = Evaluation.objects.filter(
                project=eval.project,
                is_confirmed=True
            ).exclude(judge_id=judge_id)
            
            if other_evaluations.exists():
                other_avg = other_evaluations.aggregate(avg=Avg('score'))['avg']
                if other_avg is not None:
                    deviation = abs(eval.score - other_avg)
                    deviations.append(deviation)
        
        if not deviations:
            return 1.0
        
        # Рассчитываем среднее отклонение
        avg_deviation = statistics.mean(deviations)
        
        # Преобразуем отклонение в вес
        # Максимальное отклонение - 10 баллов (предполагаем шкалу 0-10)
        max_deviation = 10
        normalized_deviation = avg_deviation / max_deviation
        
        # Инвертируем: 0 отклонение = вес 3.0, max отклонение = вес 0.1
        weight = 3.0 - (normalized_deviation * 2.9)
        
        # Ограничиваем диапазон
        return max(0.1, min(3.0, round(weight, 2)))


class TrendCalculator:
    """
    Калькулятор трендов оценок.
    """
    
    @staticmethod
    def calculate_trend_for_event(event_id: int) -> Dict[str, Any]:
        """
        Рассчитывает тренд оценок за мероприятие.
        """
        evaluations = Evaluation.objects.filter(
            project__event_id=event_id,
            is_confirmed=True
        ).order_by('evaluated_at')
        
        if not evaluations:
            return {'trend': 'stable', 'data_points': 0}
        
        # Разделяем оценки на две половины
        total_count = evaluations.count()
        split_index = total_count // 2
        
        first_half = list(evaluations[:split_index])
        second_half = list(evaluations[split_index:])
        
        avg_first = statistics.mean([e.score for e in first_half]) if first_half else 0
        avg_second = statistics.mean([e.score for e in second_half]) if second_half else 0
        
        # Определяем тренд
        if avg_second > avg_first:
            trend = 'positive'
        elif avg_second < avg_first:
            trend = 'negative'
        else:
            trend = 'stable'
        
        return {
            'trend': trend,
            'data_points': total_count,
            'first_half_average': round(avg_first, 2),
            'second_half_average': round(avg_second, 2),
            'difference': round(avg_second - avg_first, 2)
        }


class ConsensusCalculator:
    """
    Калькулятор согласованности судей.
    """
    
    @staticmethod
    def calculate_for_event(event_id: int) -> Dict[str, Any]:
        """
        Рассчитывает согласованность судей по мероприятию.
        """
        projects = ProjectWork.objects.filter(event_id=event_id)
        
        if not projects:
            return {'average_consensus': 0, 'project_count': 0}
        
        project_consensus = []
        
        for project in projects:
            evaluations = Evaluation.objects.filter(
                project=project,
                is_confirmed=True
            )
            
            if evaluations.count() >= 2:
                scores = [e.score for e in evaluations]
                
                if len(scores) > 1:
                    stdev = statistics.stdev(scores)
                    mean_score = statistics.mean(scores)
                    
                    # Коэффициент вариации
                    if mean_score > 0:
                        cv = (stdev / mean_score) * 100
                    else:
                        cv = 0
                    
                    # Консенсус (обратный коэффициент вариации)
                    consensus_score = max(0, 100 - min(cv, 100))
                    
                    project_consensus.append({
                        'project_id': project.id,
                        'project_title': project.title,
                        'consensus': round(consensus_score, 1),
                        'standard_deviation': round(stdev, 2),
                        'mean_score': round(mean_score, 2),
                        'evaluation_count': len(scores)
                    })
        
        if not project_consensus:
            return {'average_consensus': 0, 'project_count': 0}
        
        # Средний консенсус
        avg_consensus = statistics.mean([p['consensus'] for p in project_consensus])
        
        return {
            'average_consensus': round(avg_consensus, 1),
            'project_count': len(project_consensus),
            'consensus_level': ConsensusCalculator._get_consensus_level(avg_consensus)
        }
    
    @staticmethod
    def calculate_for_judge(judge_id: int, event_id: int) -> Dict[str, Any]:
        """
        Рассчитывает согласованность конкретного судьи.
        """
        judge_evaluations = Evaluation.objects.filter(
            judge_id=judge_id,
            project__event_id=event_id,
            is_confirmed=True
        ).select_related('project')
        
        if not judge_evaluations:
            return {'consensus': 0, 'evaluation_count': 0}
        
        deviations = []
        
        for eval in judge_evaluations:
            # Находим среднюю оценку других судей для этой работы
            other_evaluations = Evaluation.objects.filter(
                project=eval.project,
                is_confirmed=True
            ).exclude(judge_id=judge_id)
            
            if other_evaluations.exists():
                other_avg = other_evaluations.aggregate(avg=Avg('score'))['avg']
                if other_avg is not None:
                    deviation = abs(eval.score - other_avg)
                    deviations.append({
                        'project_id': eval.project.id,
                        'project_title': eval.project.title,
                        'judge_score': eval.score,
                        'others_average': round(other_avg, 2),
                        'deviation': round(deviation, 2)
                    })
        
        if not deviations:
            return {'consensus': 0, 'evaluation_count': judge_evaluations.count()}
        
        # Среднее отклонение
        avg_deviation = statistics.mean([d['deviation'] for d in deviations])
        
        # Преобразуем в консенсус (0-100%)
        max_deviation = 10
        consensus_score = max(0, 100 - (avg_deviation / max_deviation) * 100)
        
        return {
            'judge_id': judge_id,
            'consensus': round(consensus_score, 1),
            'average_deviation': round(avg_deviation, 2),
            'evaluation_count': judge_evaluations.count(),
            'deviations_count': len(deviations),
            'consensus_level': ConsensusCalculator._get_consensus_level(consensus_score)
        }
    
    @staticmethod
    def _get_consensus_level(consensus_score: float) -> str:
        """Определяет уровень консенсуса."""
        if consensus_score >= 90:
            return 'excellent'
        elif consensus_score >= 75:
            return 'good'
        elif consensus_score >= 60:
            return 'moderate'
        elif consensus_score >= 40:
            return 'low'
        else:
            return 'poor'


class EngagementCalculator:
    """
    Калькулятор вовлеченности участников.
    """
    
    @staticmethod
    def calculate_for_participant(participant: EventParticipant) -> Dict[str, Any]:
        """
        Рассчитывает вовлеченность конкретного участника.
        """
        user_id = participant.user_id
        event_id = participant.event_id
        
        criteria = {
            'has_project': False,
            'project_on_time': False,
            'has_evaluations': False,
            'session_participation': False,
        }
        
        details = {}
        
        # Проверка проекта
        try:
            project = ProjectWork.objects.get(
                event_id=event_id,
                participant_id=user_id
            )
            criteria['has_project'] = True
            details['project'] = {
                'title': project.title,
                'submitted_at': project.submitted_at,
                'status': project.status
            }
            
            # Проверка своевременности
            if participant.event.registration_ends_at:
                criteria['project_on_time'] = (
                    project.submitted_at <= participant.event.registration_ends_at
                )
                details['project_on_time'] = criteria['project_on_time']
        except ProjectWork.DoesNotExist:
            details['project'] = 'Не загружено'
        
        # Проверка оценок (для судей)
        if participant.role == 'referee':
            eval_count = Evaluation.objects.filter(
                judge_id=user_id,
                project__event_id=event_id
            ).count()
            criteria['has_evaluations'] = eval_count > 0
            details['evaluation_count'] = eval_count
        
        # Рассчитываем балл
        score = sum(1 for value in criteria.values() if value)
        max_score = len(criteria)
        engagement_percentage = (score / max_score) * 100 if max_score > 0 else 0
        
        return {
            'user_id': user_id,
            'email': participant.user.email,
            'role': participant.role,
            'engagement_score': round(engagement_percentage, 1),
            'criteria_met': score,
            'total_criteria': max_score,
            'criteria_details': criteria,
            'details': details,
            'engagement_level': EngagementCalculator._get_engagement_level(engagement_percentage)
        }
    
    @staticmethod
    def _get_engagement_level(engagement_score: float) -> str:
        """Определяет уровень вовлеченности."""
        if engagement_score >= 80:
            return 'high'
        elif engagement_score >= 50:
            return 'medium'
        else:
            return 'low'