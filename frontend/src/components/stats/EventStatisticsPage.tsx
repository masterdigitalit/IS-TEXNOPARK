import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { statsService } from '@/services/stats-service';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard, GradeDistribution, LeaderboardRow } from './StatisticsComponents';
import {
  ChartBarIcon,
  TrophyIcon,
  UsersIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  StarIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { handleApiError } from '@/utils/error-handler';

const EventStatisticsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard'>('overview');

  const [statistics, setStatistics] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [participantStats, setParticipantStats] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      setError(null);

      // Сначала пересчитываем статистику для актуальных данных
      await statsService.calculateEventStatistics(parseInt(eventId));

      const [stats, leaderboardData, participantStatsData] = await Promise.all([
        statsService.getEventStatistics(parseInt(eventId)),
        statsService.getEventLeaderboard(parseInt(eventId)),
        statsService.getEventParticipantStatistics(parseInt(eventId)),
      ]);

      setStatistics(stats);
      // Сортируем по убыванию оценки на всякий случай
      const sortedLeaderboard = [...leaderboardData].sort((a, b) => b.average_score - a.average_score);
      setLeaderboard(sortedLeaderboard);
      setParticipantStats(participantStatsData);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!eventId) return;

    try {
      setRecalculating(true);
      const stats = await statsService.calculateEventStatistics(parseInt(eventId));
      setStatistics(stats);
      await loadData();
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  const getGradeDistribution = () => {
    if (!statistics) return [];

    return [
      { grade: 5, count: statistics.count_grade_5_total, percentage: 0 },
      { grade: 4, count: statistics.count_grade_4_total, percentage: 0 },
      { grade: 3, count: statistics.count_grade_3_total, percentage: 0 },
      { grade: 2, count: statistics.count_grade_2_total, percentage: 0 },
      { grade: 1, count: statistics.count_grade_1_total, percentage: 0 },
    ].filter((item) => item.count > 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-4">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {statistics?.event_name || 'Статистика события'}
                </h1>
                <p className="text-sm text-gray-500">
                  Обновлено: {statistics ? new Date(statistics.calculated_at).toLocaleDateString('ru-RU') : ''}
                </p>
              </div>
            </div>
            <Button
              onClick={handleRecalculate}
              disabled={recalculating}
              variant="outline"
            >
              <ArrowPathIcon className={cn('h-4 w-4 mr-2', recalculating && 'animate-spin')} />
              {recalculating ? 'Пересчет...' : 'Пересчитать'}
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                activeTab === 'overview'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Обзор
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                activeTab === 'leaderboard'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Рейтинг
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Средний балл"
                value={statistics?.average_score ? parseFloat(statistics.average_score).toFixed(2) : 'N/A'}
                icon={<StarIcon className="h-6 w-6" />}
                color="blue"
                description="по всем участникам"
              />
              <StatCard
                title="Участников"
                value={statistics?.total_participants_rated || 0}
                icon={<UsersIcon className="h-6 w-6" />}
                color="green"
                description="с оценками"
              />
              <StatCard
                title="Всего оценок"
                value={statistics?.total_ratings_given || 0}
                icon={<ChartBarIcon className="h-6 w-6" />}
                color="purple"
                description="выставлено судьями"
              />
              <StatCard
                title="Популярная оценка"
                value={statistics?.most_popular_grade_total || '-'}
                icon={<TrophyIcon className="h-6 w-6" />}
                color="orange"
                description="наиболее частая"
              />
            </div>

            {/* Grade Distribution */}
            {getGradeDistribution().length > 0 && (
              <GradeDistribution grades={getGradeDistribution()} />
            )}

            {/* Session Statistics */}
            {statistics?.session_averages && Object.keys(statistics.session_averages).length > 0 && (
              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Статистика по сессиям
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(statistics.session_averages).map(([sessionId, avg]) => (
                    <div key={sessionId} className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">
                        {sessionId.replace(/_/g, ' ')}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {typeof avg === 'number' ? avg.toFixed(2) : avg}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Participants Preview */}
            {leaderboard.length > 0 && (
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Топ-3 участников
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('leaderboard')}
                  >
                    Показать все
                  </Button>
                </div>
                <div className="space-y-2">
                  {leaderboard.slice(0, 3).map((entry) => (
                    <LeaderboardRow key={entry.participant_id} entry={entry} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-xl border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Рейтинг участников
              </h2>
            </div>
            <div className="divide-y">
              {leaderboard.length > 0 ? (
                (() => {
                  let displayPosition = 1;
                  let uniqueRank = 1; // Счетчик уникальных позиций
                  let previousScore: number | null = null;
                  
                  return leaderboard.map((entry, index) => {
                    // Округляем до 2 знаков для надежного сравнения
                    const currentScore = Math.round(entry.average_score * 100) / 100;
                    
                    // Если оценка отличается от предыдущей, увеличиваем счетчик уникальных позиций
                    if (previousScore === null || currentScore !== previousScore) {
                      displayPosition = uniqueRank;
                      uniqueRank++;
                    }
                    // Если оценка такая же, оставляем предыдущую позицию (не меняем displayPosition)
                    previousScore = currentScore;
                    
                    // Создаем новый объект с правильной позицией
                    const entryWithPosition = {
                      position: displayPosition,
                      participant_id: entry.participant_id,
                      participant_name: entry.participant_name,
                      average_score: entry.average_score
                    };
                    
                    return (
                      <LeaderboardRow
                        key={`${entry.participant_id}-${displayPosition}`}
                        entry={entryWithPosition}
                        className="px-6 py-4"
                      />
                    );
                  });
                })()
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <TrophyIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p>Рейтинг пока пуст</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export default EventStatisticsPage;
