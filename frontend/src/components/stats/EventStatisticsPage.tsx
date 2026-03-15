import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { statsService } from '@/services/stats-service';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChartBarIcon,
  TrophyIcon,
  UsersIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  StarIcon,
  AcademicCapIcon,
  SparklesIcon,
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

  const loadData = async (skipCalculate = false) => {
    if (!eventId) return;

    try {
      setLoading(true);
      setError(null);

      // Пересчитываем статистику только если не skipCalculate
      if (!skipCalculate) {
        try {
          console.log('Calculating statistics for event:', eventId);
          const calcResult = await statsService.calculateEventStatistics(parseInt(eventId));
          console.log('Calculation result:', calcResult);
        } catch (calcErr) {
          // Игнорируем ошибки пересчета, продолжаем загрузку
          console.warn('Statistics calculation failed:', calcErr);
        }
      }

      console.log('Loading statistics data for event:', eventId);

      const [stats, leaderboardData, participantStatsData] = await Promise.all([
        statsService.getEventStatistics(parseInt(eventId)),
        statsService.getEventLeaderboard(parseInt(eventId)),
        statsService.getEventParticipantStatistics(parseInt(eventId)),
      ]);

      console.log('Loaded statistics:', stats);
      console.log('Loaded leaderboard:', leaderboardData);
      console.log('Loaded participant stats:', participantStatsData);

      setStatistics(stats);
      const sortedLeaderboard = [...leaderboardData].sort((a, b) => b.average_score - a.average_score);
      setLeaderboard(sortedLeaderboard);
      setParticipantStats(participantStatsData);
    } catch (err: any) {
      console.error('Load data error:', err);
      const apiError = handleApiError(err);
      setError(apiError.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!eventId) return;

    try {
      setRecalculating(true);
      setError(null);
      
      console.log('Starting statistics recalculation for event:', eventId);
      
      // Сначала пересчитываем
      const calcResult = await statsService.calculateEventStatistics(parseInt(eventId));
      console.log('Recalculation result:', calcResult);
      
      // Небольшая задержка перед загрузкой обновленных данных
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Загружаем данные заново после пересчета
      await loadData(true);
      
      console.log('Statistics recalculation complete');
    } catch (err: any) {
      console.error('Recalculation error:', err);
      const apiError = handleApiError(err);
      setError(apiError.message || 'Ошибка при пересчете статистики');
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, [eventId]);

  const getGradeDistribution = () => {
    if (!statistics) return [];

    return [
      { grade: 5, count: statistics.count_grade_5_total, percentage: 0, color: 'bg-emerald-500' },
      { grade: 4, count: statistics.count_grade_4_total, percentage: 0, color: 'bg-blue-500' },
      { grade: 3, count: statistics.count_grade_3_total, percentage: 0, color: 'bg-amber-500' },
      { grade: 2, count: statistics.count_grade_2_total, percentage: 0, color: 'bg-orange-500' },
      { grade: 1, count: statistics.count_grade_1_total, percentage: 0, color: 'bg-red-500' },
    ].filter((item) => item.count > 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
            <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline"
            className="gradient-primary text-white border-0"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-white border-b shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-gray-100 rounded-xl"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {statistics?.event_name || 'Статистика события'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Обновлено: {statistics ? new Date(statistics.calculated_at).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }) : ''}
                </p>
              </div>
            </div>
            <Button
              onClick={handleRecalculate}
              disabled={recalculating}
              variant="outline"
              className="rounded-xl border-2 hover:bg-blue-50 hover:text-blue-700"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${recalculating && 'animate-spin'}`} />
              {recalculating ? 'Пересчет...' : 'Пересчитать'}
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`
                px-5 py-2.5 rounded-xl font-semibold transition-all-sm flex items-center gap-2
                ${activeTab === 'overview'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <ChartBarIcon className="h-4 w-4" />
              Обзор
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`
                px-5 py-2.5 rounded-xl font-semibold transition-all-sm flex items-center gap-2
                ${activeTab === 'leaderboard'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <TrophyIcon className="h-4 w-4" />
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
                gradient="from-blue-500 to-blue-600"
              />
              <StatCard
                title="Участников"
                value={statistics?.total_participants_rated || 0}
                icon={<UsersIcon className="h-6 w-6" />}
                color="emerald"
                description="с оценками"
                gradient="from-emerald-500 to-emerald-600"
              />
              <StatCard
                title="Всего оценок"
                value={statistics?.total_ratings_given || 0}
                icon={<ChartBarIcon className="h-6 w-6" />}
                color="violet"
                description="выставлено судьями"
                gradient="from-violet-500 to-violet-600"
              />
              <StatCard
                title="Популярная оценка"
                value={statistics?.most_popular_grade_total || '-'}
                icon={<TrophyIcon className="h-6 w-6" />}
                color="amber"
                description="наиболее частая"
                gradient="from-amber-500 to-orange-500"
              />
            </div>

            {/* Grade Distribution */}
            {getGradeDistribution().length > 0 && (
              <GradeDistribution grades={getGradeDistribution()} />
            )}

            {/* Session Statistics */}
            {statistics?.session_averages && Object.keys(statistics.session_averages).length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-soft p-6">
                <div className="flex items-center gap-2 mb-6">
                  <SparklesIcon className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">
                    Статистика по сессиям
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(statistics.session_averages).map(([sessionId, avg]) => (
                    <div key={sessionId} className="bg-gradient-subtle rounded-xl p-4 border border-gray-100 hover:border-blue-200 transition-all-sm">
                      <p className="text-sm text-gray-600 mb-2 font-medium capitalize">
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
              <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-soft p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <TrophyIcon className="h-5 w-5 text-amber-500" />
                    <h3 className="text-lg font-bold text-gray-900">
                      Топ-3 участников
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('leaderboard')}
                    className="text-blue-600 hover:bg-blue-50 rounded-xl"
                  >
                    Показать все
                  </Button>
                </div>
                <div className="space-y-3">
                  {leaderboard.slice(0, 3).map((entry, index) => (
                    <LeaderboardRow 
                      key={entry.participant_id} 
                      entry={{ ...entry, position: index + 1 }} 
                      compact
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-soft overflow-hidden">
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2">
                <TrophyIcon className="h-6 w-6 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  Рейтинг участников
                </h2>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {leaderboard.length > 0 ? (
                (() => {
                  let displayPosition = 1;
                  let uniqueRank = 1;
                  let previousScore: number | null = null;

                  return leaderboard.map((entry, index) => {
                    const currentScore = Math.round(entry.average_score * 100) / 100;

                    if (previousScore === null || currentScore !== previousScore) {
                      displayPosition = uniqueRank;
                      uniqueRank++;
                    }
                    previousScore = currentScore;

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
                      />
                    );
                  });
                })()
              ) : (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                    <TrophyIcon className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Рейтинг пока пуст</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  description: string;
  gradient: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, description, gradient }) => {
  return (
    <div className="bg-white rounded-2xl shadow-soft border-2 border-gray-100 p-6 hover:shadow-elevated transition-all-lg group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg group-hover:scale-110 transition-all-sm`}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
};

// Grade Distribution Component
interface GradeDistributionProps {
  grades: Array<{ grade: number; count: number; color: string }>;
}

const GradeDistribution: React.FC<GradeDistributionProps> = ({ grades }) => {
  const maxCount = Math.max(...grades.map(g => g.count));
  
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-soft p-6">
      <div className="flex items-center gap-2 mb-6">
        <StarIcon className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-bold text-gray-900">
          Распределение оценок
        </h3>
      </div>
      <div className="space-y-4">
        {grades.map((item) => (
          <div key={item.grade} className="flex items-center gap-4">
            <div className="w-8 text-center">
              <span className="text-lg font-bold text-gray-900">{item.grade}</span>
            </div>
            <div className="flex-1 h-10 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${item.color} rounded-full transition-all-lg duration-500 flex items-center justify-end pr-3`}
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              >
                <span className="text-white text-sm font-semibold">{item.count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Leaderboard Row Component
interface LeaderboardRowProps {
  entry: {
    position: number;
    participant_id: number;
    participant_name: string;
    average_score: number;
  };
  compact?: boolean;
  className?: string;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ entry, compact, className }) => {
  const getMedalColor = (position: number) => {
    switch (position) {
      case 1: return 'from-yellow-400 to-yellow-500 shadow-yellow-500/50';
      case 2: return 'from-gray-400 to-gray-500 shadow-gray-500/50';
      case 3: return 'from-amber-600 to-amber-700 shadow-amber-500/50';
      default: return 'from-blue-500 to-blue-600 shadow-blue-500/50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className={`flex items-center gap-4 hover:bg-blue-50 transition-all-sm ${compact ? 'py-3' : 'py-4 px-6'} ${className || ''}`}>
      {/* Position */}
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg
        bg-gradient-to-br ${getMedalColor(entry.position)}
        ${entry.position <= 3 ? 'scale-110' : ''}
      `}>
        {entry.position}
      </div>

      {/* Participant Info */}
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{entry.participant_name}</p>
        {compact && (
          <p className={`text-sm font-medium ${getScoreColor(entry.average_score)}`}>
            {entry.average_score.toFixed(2)} баллов
          </p>
        )}
      </div>

      {/* Score */}
      <div className="text-right">
        <p className={`text-2xl font-bold ${getScoreColor(entry.average_score)}`}>
          {entry.average_score.toFixed(2)}
        </p>
        {!compact && (
          <p className="text-xs text-gray-500">баллов</p>
        )}
      </div>
    </div>
  );
};

export default EventStatisticsPage;
