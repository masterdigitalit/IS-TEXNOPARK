import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { statsService } from '@/services/stats-service';
import { ParticipantCard, RatingCard } from './StatisticsComponents';
import { RatingForm } from './RatingForm';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  StarIcon,
  ChartBarIcon,
  UserCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { handleApiError } from '@/utils/error-handler';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Загрузка статистики участника...</p>
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
                onClick={() => navigate(`/events/${eventId}/statistics`)}
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
              <ParticipantCard participant={participantStats} />
            )}

            {/* Score Progress */}
            {participantStats?.final_score && (
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-lg">
                      <StarIcon className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-blue-100 text-sm">Итоговый балл</p>
                      <p className="text-4xl font-bold">{participantStats.final_score}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-100 text-sm">из 5</p>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon
                          key={star}
                          className={cn(
                            'h-6 w-6',
                            star <= participantStats.final_score
                              ? 'text-yellow-300 fill-yellow-300'
                              : 'text-white/30'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {participantStats.average_score && (
                  <div className="pt-4 border-t border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-100">Средний балл</span>
                      <span className="text-2xl font-semibold">
                        {parseFloat(participantStats.average_score).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Session Scores */}
            {participantStats?.session_scores_count && Object.keys(participantStats.session_scores_count).length > 0 && (
              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-blue-600" />
                  Оценки по сессиям
                </h3>
                <div className="space-y-3">
                  {Object.entries(participantStats.session_scores_count).map(([session, count]) => (
                    <div key={session} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700 capitalize">
                        {session.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ratings List */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Оценки судей ({ratings.length})
              </h3>
              {ratings.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {ratings.map((rating) => (
                    <RatingCard key={rating.id} rating={rating} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <UserCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p>Оценок пока нет</p>
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

export default ParticipantStatisticsPage;
