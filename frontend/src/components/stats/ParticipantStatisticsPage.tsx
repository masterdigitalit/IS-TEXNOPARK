import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { statsService } from '@/services/stats-service';
import { RatingForm } from './RatingForm';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  StarIcon,
  ChartBarIcon,
  UserCircleIcon,
  PlusIcon,
  SparklesIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { handleApiError } from '@/utils/error-handler';
import { useAuth } from '@/contexts/AuthContext';

const ParticipantStatisticsPage: React.FC = () => {
  const { eventId, participantId } = useParams<{ eventId: string; participantId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [participantStats, setParticipantStats] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!eventId || !participantId) return;

    try {
      setLoading(true);
      setError(null);

      const [stats, ratingsData] = await Promise.all([
        statsService.getParticipantFinalScore(parseInt(eventId), parseInt(participantId)),
        statsService.getParticipantRatings(parseInt(eventId), parseInt(participantId)),
      ]);

      setParticipantStats(stats);
      setRatings(ratingsData);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId, participantId]);

  const handleRatingSuccess = () => {
    loadData();
    setShowRatingForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
            <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Загрузка статистики участника...</p>
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
          <Button onClick={() => navigate(-1)} variant="outline" className="rounded-xl border-2 hover:bg-blue-50 hover:text-blue-700">
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
                onClick={() => navigate(`/events/${eventId}/statistics`)}
                className="hover:bg-gray-100 rounded-xl"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {participantStats?.participant_name || 'Статистика участника'}
                </h1>
                <p className="text-sm text-gray-500">
                  {participantStats?.participant_email}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowRatingForm(true)}
              disabled={!user?.is_staff && user?.id !== participantStats?.event}
              className="gradient-primary rounded-xl shadow-lg hover:shadow-glow transition-all-lg"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Выставить оценку
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Participant Card */}
            {participantStats && (
              <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-soft p-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
                    <UserCircleIcon className="h-12 w-12 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{participantStats.participant_name}</h2>
                    <p className="text-gray-500 text-sm">{participantStats.participant_email}</p>
                    {participantStats.role_display && (
                      <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        {participantStats.role_display}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Score Progress */}
            {participantStats?.final_score && (
              <div className="gradient-primary rounded-2xl p-8 text-white shadow-xl shadow-blue-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                        <StarSolidIcon className="h-10 w-10 text-yellow-300" />
                      </div>
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Итоговый балл</p>
                        <p className="text-5xl font-bold mt-1">{participantStats.final_score}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-100 text-sm">из 5</p>
                      <div className="flex gap-1.5 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarSolidIcon
                            key={star}
                            className={`h-7 w-7 ${
                              star <= participantStats.final_score
                                ? 'text-yellow-300'
                                : 'text-white/30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {participantStats.average_score && (
                    <div className="pt-6 border-t border-white/20">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-100 font-medium">Средний балл</span>
                        <span className="text-3xl font-bold">
                          {parseFloat(participantStats.average_score).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Session Scores */}
            {participantStats?.session_scores_count && Object.keys(participantStats.session_scores_count).length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-soft p-6">
                <div className="flex items-center gap-2 mb-6">
                  <ChartBarIcon className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Оценки по сессиям</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(participantStats.session_scores_count).map(([session, count]) => (
                    <div key={session} className="flex items-center gap-4 p-4 bg-gradient-subtle rounded-xl border border-gray-100">
                      <div className="w-32">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {session.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full gradient-primary rounded-full transition-all-lg duration-500"
                          style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-10 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ratings List */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-soft p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrophyIcon className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-bold text-gray-900">
                  Оценки судей ({ratings.length})
                </h3>
              </div>
              {ratings.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {ratings.map((rating, index) => (
                    <RatingCard key={rating.id} rating={rating} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Оценок пока нет</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rating Form Modal */}
      {showRatingForm && participantStats && (
        <RatingForm
          eventId={parseInt(eventId!)}
          participantId={parseInt(participantId!)}
          participantName={participantStats.participant_name}
          refereeId={user!.id}
          onSuccess={handleRatingSuccess}
          onClose={() => setShowRatingForm(false)}
        />
      )}
    </div>
  );
};

// Rating Card Component
interface RatingCardProps {
  rating: {
    id: number;
    score: number;
    comment?: string;
    referee_name?: string;
    created_at?: string;
  };
  index?: number;
}

const RatingCard: React.FC<RatingCardProps> = ({ rating, index = 0 }) => {
  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'from-emerald-500 to-emerald-600';
    if (score >= 3.5) return 'from-blue-500 to-blue-600';
    if (score >= 2.5) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-gradient-subtle rounded-xl p-4 border border-gray-100 hover:border-blue-200 transition-all-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br ${getScoreColor(rating.score)}`}>
            {rating.score.toFixed(1)}
          </div>
          <div>
            {rating.referee_name && (
              <p className="font-semibold text-gray-900">{rating.referee_name}</p>
            )}
            {rating.created_at && (
              <p className="text-xs text-gray-500">{formatDate(rating.created_at)}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarSolidIcon
              key={star}
              className={`h-4 w-4 ${
                star <= Math.round(rating.score)
                  ? 'text-amber-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
      {rating.comment && (
        <p className="text-sm text-gray-600 bg-white/50 rounded-lg p-3">
          {rating.comment}
        </p>
      )}
    </div>
  );
};

export default ParticipantStatisticsPage;
