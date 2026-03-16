import React from 'react';
import { ChartBarIcon, TrophyIcon, UsersIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  className?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const gradients = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-emerald-500 to-emerald-600',
  purple: 'from-violet-500 to-violet-600',
  orange: 'from-amber-500 to-orange-500',
  red: 'from-red-500 to-red-600',
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
    <div className={`
      bg-white dark:bg-slate-800 rounded-2xl border-2 border-gray-100 dark:border-slate-700 p-6
      hover:shadow-elevated transition-all-lg group dark:transition-theme
      ${className || ''}
    `}>
      <div className="flex items-center justify-between mb-4">
        <div className={`
          p-3 rounded-xl bg-gradient-to-br ${gradients[color]} text-white
          shadow-lg group-hover:scale-110 transition-all-sm
        `}>
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        {description && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>
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

  const gradeColors = {
    5: 'from-emerald-500 to-emerald-600',
    4: 'from-blue-500 to-blue-600',
    3: 'from-amber-500 to-amber-600',
    2: 'from-orange-500 to-orange-600',
    1: 'from-red-500 to-red-600',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-gray-100 dark:border-slate-700 shadow-soft p-6 transition-theme">
      <div className="flex items-center gap-2 mb-6">
        <StarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="space-y-4">
        {grades.map((item) => (
          <div key={item.grade} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center border border-gray-200 dark:border-slate-600">
              <span className="text-lg font-bold text-gray-900 dark:text-white">{item.grade}</span>
            </div>
            <div className="flex-1 h-12 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${gradeColors[item.grade as keyof typeof gradeColors]} rounded-full transition-all-lg duration-500 flex items-center justify-end pr-4`}
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              >
                <span className="text-white text-sm font-bold">{item.count}</span>
              </div>
            </div>
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
      return score === 1 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600';
    }
    if (score >= 4) return 'from-emerald-500 to-emerald-600';
    if (score >= 3) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className={`
      bg-gradient-subtle dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5
      hover:border-blue-200 dark:hover:border-blue-700 transition-all-sm dark:transition-theme
      ${className || ''}
    `}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
            <span className="text-lg font-bold text-white">
              {rating.referee_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{rating.referee_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(rating.created_at)}</p>
          </div>
        </div>
        <div className={`
          px-4 py-2 rounded-xl text-sm font-bold text-white
          bg-gradient-to-r ${getScoreColor(rating.score, rating.grading_system)}
          shadow-lg
        `}>
          {rating.grading_system === 'pass_fail'
            ? (rating.score === 1 ? 'Зачет' : 'Незачет')
            : `${rating.score} из 5`}
        </div>
      </div>
      {rating.comment && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600">
          <p className="text-sm text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-slate-700/60 rounded-lg p-3">{rating.comment}</p>
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
    switch (position) {
      case 1: return 'from-yellow-400 to-yellow-500 shadow-yellow-500/50';
      case 2: return 'from-gray-400 to-gray-500 shadow-gray-500/50';
      case 3: return 'from-amber-600 to-amber-700 shadow-amber-500/50';
      default: return 'from-blue-500 to-blue-600 shadow-blue-500/50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 3.5) return 'text-blue-600 dark:text-blue-400';
    if (score >= 2.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className={`
      flex items-center gap-4 p-5 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-all-sm
      ${className || ''}
    `}>
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-lg
        bg-gradient-to-br ${getPositionStyle(entry.position)}
        ${entry.position <= 3 ? 'scale-110' : ''}
      `}>
        {entry.position}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900 dark:text-white">{entry.participant_name}</p>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-2">
          <StarSolidIcon className="h-5 w-5 text-amber-400" />
          <span className={`text-2xl font-bold ${getScoreColor(entry.average_score)}`}>
            {entry.average_score.toFixed(2)}
          </span>
        </div>
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
    <div className={`
      bg-white dark:bg-slate-800 rounded-2xl border-2 border-gray-100 dark:border-slate-700 shadow-soft p-6
      transition-all-lg hover:shadow-elevated dark:transition-theme
      ${className || ''}
    `}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-xl">
            <span className="text-2xl font-bold text-white">
              {participant.participant_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{participant.participant_name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{participant.participant_email}</p>
          </div>
        </div>
        {participant.final_score && (
          <div className="text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800">
              <StarSolidIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{participant.final_score}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">итоговый балл</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {participant.average_score && (
          <div className="bg-gradient-subtle dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-slate-600">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Средний балл</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {participant.average_score.toFixed(2)}
            </p>
          </div>
        )}
        {participant.most_popular_grades && (
          <div className="bg-gradient-subtle dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-slate-600">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Популярные оценки</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {participant.most_popular_grades}
            </p>
          </div>
        )}
      </div>

      {Object.keys(participant.session_scores_count).length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">Оценок по сессиям</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(participant.session_scores_count).map(([session, count]) => (
              <span
                key={session}
                className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold rounded-xl border border-blue-100 dark:border-blue-800"
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
