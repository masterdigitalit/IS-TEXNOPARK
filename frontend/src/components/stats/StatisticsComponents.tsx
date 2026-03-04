import React from 'react';
import { ChartBarIcon, TrophyIcon, UsersIcon, StarIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  className?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const colorVariants = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  red: 'bg-red-50 text-red-600 border-red-200',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  description,
  className,
  color = 'blue',
}) => {
  return (
    <div className={cn(
      'rounded-xl border p-6 transition-all duration-300 hover:shadow-lg',
      colorVariants[color],
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn('p-2 rounded-lg bg-white/60', colorVariants[color])}>
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium opacity-80">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
        {description && (
          <p className="text-xs opacity-60">{description}</p>
        )}
      </div>
    </div>
  );
};

interface GradeDistributionProps {
  grades: {
    grade: number;
    count: number;
    percentage: number;
  }[];
  title?: string;
}

export const GradeDistribution: React.FC<GradeDistributionProps> = ({
  grades,
  title = 'Распределение оценок',
}) => {
  const maxCount = Math.max(...grades.map((g) => g.count), 1);

  return (
    <div className="bg-white rounded-xl border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {grades.map((item) => (
          <div key={item.grade} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 w-8">
              {item.grade}
            </span>
            <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-600 w-12 text-right">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface RatingCardProps {
  rating: {
    referee_name: string;
    score: number;
    comment?: string | null;
    created_at: string;
    grading_system: 'five_point' | 'pass_fail';
  };
  className?: string;
}

export const RatingCard: React.FC<RatingCardProps> = ({ rating, className }) => {
  const getScoreColor = (score: number, system: string) => {
    if (system === 'pass_fail') {
      return score === 1 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
    }
    if (score >= 4) return 'text-green-600 bg-green-50';
    if (score >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn(
      'bg-white rounded-lg border p-4 transition-all duration-200 hover:shadow-md',
      className
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-600">
              {rating.referee_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{rating.referee_name}</p>
            <p className="text-xs text-gray-500">{formatDate(rating.created_at)}</p>
          </div>
        </div>
        <div className={cn(
          'px-3 py-1 rounded-full text-sm font-semibold',
          getScoreColor(rating.score, rating.grading_system)
        )}>
          {rating.grading_system === 'pass_fail'
            ? (rating.score === 1 ? 'Зачет' : 'Незачет')
            : `${rating.score} из 5`}
        </div>
      </div>
      {rating.comment && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-700">{rating.comment}</p>
        </div>
      )}
    </div>
  );
};

interface LeaderboardRowProps {
  entry: {
    position: number;
    participant_name: string;
    average_score: number;
  };
  className?: string;
}

export const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ entry, className }) => {
  const getPositionStyle = (position: number) => {
    if (position === 1) return 'bg-yellow-100 text-yellow-800';
    if (position === 2) return 'bg-gray-100 text-gray-800';
    if (position === 3) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-50 text-gray-600';
  };

  return (
    <div className={cn(
      'flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors',
      className
    )}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
        getPositionStyle(entry.position)
      )}>
        {entry.position}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{entry.participant_name}</p>
      </div>
      <div className="flex items-center gap-2">
        <StarIcon className="h-5 w-5 text-yellow-500" />
        <span className="text-lg font-semibold text-gray-900">
          {entry.average_score.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

interface ParticipantCardProps {
  participant: {
    participant_name: string;
    participant_email: string;
    final_score: number | null;
    average_score: number | null;
    most_popular_grades: string | null;
    session_scores_count: Record<string, number>;
  };
  className?: string;
}

export const ParticipantCard: React.FC<ParticipantCardProps> = ({ participant, className }) => {
  return (
    <div className={cn(
      'bg-white rounded-xl border p-6 transition-all duration-200 hover:shadow-md',
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-lg font-bold text-white">
              {participant.participant_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{participant.participant_name}</h3>
            <p className="text-sm text-gray-500">{participant.participant_email}</p>
          </div>
        </div>
        {participant.final_score && (
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{participant.final_score}</p>
            <p className="text-xs text-gray-500">итоговый балл</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {participant.average_score && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Средний балл</p>
            <p className="text-lg font-semibold text-gray-900">
              {participant.average_score.toFixed(2)}
            </p>
          </div>
        )}
        {participant.most_popular_grades && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Популярные оценки</p>
            <p className="text-lg font-semibold text-gray-900">
              {participant.most_popular_grades}
            </p>
          </div>
        )}
      </div>

      {Object.keys(participant.session_scores_count).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Оценок по сессиям</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(participant.session_scores_count).map(([session, count]) => (
              <span
                key={session}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
              >
                {session.replace(/_/g, ' ')}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
