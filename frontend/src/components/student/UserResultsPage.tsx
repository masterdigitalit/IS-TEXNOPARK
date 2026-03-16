// src/components/student/UserResultsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrophyIcon,
  CalendarIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

interface ParticipantResult {
  id: number;
  event_name: string;
  event_id: number;
  participant_name: string;
  final_score: number | null;
  average_score: number | null;
  position: number | null;
  total_participants: number;
  sessions_count: number;
  graded_sessions_count: number;
  created_at: string;
}

const UserResultsPage: React.FC = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<ParticipantResult[]>('/api/v1/events/my-results/');
      setResults(data);
    } catch (err: any) {
      console.error('Ошибка загрузки результатов:', err);
      setError(err.message || 'Не удалось загрузить результаты');
    } finally {
      setLoading(false);
    }
  };

  const getTotalScore = () => {
    const scoredResults = results.filter(r => r.final_score !== null);
    if (scoredResults.length === 0) return 0;
    const total = scoredResults.reduce((sum, r) => sum + (r.final_score || 0), 0);
    return (total / scoredResults.length).toFixed(2);
  };

  const getBestResult = () => {
    const scoredResults = results.filter(r => r.final_score !== null);
    if (scoredResults.length === 0) return 0;
    return Math.max(...scoredResults.map(r => r.final_score || 0));
  };

  const getParticipationsCount = () => {
    return results.length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6 transition-theme">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка результатов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6 transition-theme">
      {/* Хедер */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/user/dashboard"
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Назад
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Мои результаты</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              История ваших выступлений и достижений
            </p>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-theme">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Участий всего</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{getParticipationsCount()}</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <UserGroupIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-theme">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Средний балл</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{getTotalScore()}</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
              <ChartBarIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-theme">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Лучший результат</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{getBestResult()}</p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl">
              <TrophyIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-theme">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Наград</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {results.filter(r => r.position !== null && r.position <= 3).length}
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
              <StarIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Таблица результатов */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-theme">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">История выступлений</h2>
        </div>

        {results.length === 0 ? (
          <div className="text-center py-12">
            <TrophyIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Пока нет результатов
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Участвуйте в конференциях чтобы получить первые результаты
            </p>
            <Link
              to="/user/events"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <AcademicCapIcon className="h-5 w-5 mr-2" />
              Найти конференцию
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Событие
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Место
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Балл
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Участников
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {results.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        to={`/user/events/${result.event_id}`}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        {result.event_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                        {new Date(result.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {result.position !== null ? (
                        <div className="flex items-center">
                          {result.position === 1 && <span className="text-yellow-500 mr-2">🥇</span>}
                          {result.position === 2 && <span className="text-gray-400 mr-2">🥈</span>}
                          {result.position === 3 && <span className="text-amber-600 mr-2">🥉</span>}
                          <span className={`font-bold ${
                            result.position === 1 ? 'text-yellow-600 dark:text-yellow-400' :
                            result.position === 2 ? 'text-gray-600 dark:text-gray-400' :
                            result.position === 3 ? 'text-amber-600 dark:text-amber-400' :
                            'text-gray-900 dark:text-white'
                          }`}>
                            {result.position}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {result.final_score !== null ? (
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {result.final_score}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">В ожидании</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {result.total_participants}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserResultsPage;
