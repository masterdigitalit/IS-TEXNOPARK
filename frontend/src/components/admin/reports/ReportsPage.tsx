// src/components/admin/reports/ReportsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api-client';
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserIcon,
  VideoCameraIcon,
  MapPinIcon,
  TrophyIcon,
  StarIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { handleApiError } from '@/utils/error-handler';

interface Event {
  id: number;
  name: string;
  description: string | null;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  status_display: string;
  owner: {
    id: number;
    username: string;
    email: string;
    full_name: string;
  };
  owner_id: number;
  created_at: string;
  closes_at: string | null;
  image_url: string | null;
  is_active: boolean;
  is_open: boolean;
  has_online_sessions: boolean;
  has_offline_sessions: boolean;
  participants_count: number;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Event[];
}

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

  const loadEvents = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get<ApiResponse>('/api/v1/events/all/');
      setEvents(response.results);
      setFilteredEvents(response.results);
    } catch (err: any) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = events.filter(event =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredEvents(filtered);
    } else {
      setFilteredEvents(events);
    }
  }, [searchTerm, events]);

  const handleViewStatistics = (eventId: number) => {
    navigate(`/events/${eventId}/statistics`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не указана';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'published': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const totalParticipants = events.reduce((sum, e) => sum + e.participants_count, 0);
  const activeEvents = events.filter(e => e.is_active && e.status === 'published').length;

  return (
    <div className="min-h-screen bg-gradient-subtle dark:from-slate-950 dark:to-slate-900 transition-theme">
      {/* Header */}
      <div className="gradient-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }} />
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-5 mb-8">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md shadow-xl">
                <ChartBarIcon className="h-12 w-12" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Отчеты и аналитика</h1>
                <p className="text-blue-100 mt-2 text-lg">
                  Просмотр статистики и результатов событий
                </p>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg hover:bg-white/15 transition-all-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-yellow-400/20 rounded-xl">
                    <TrophyIcon className="h-7 w-7 text-yellow-300" />
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Всего событий</p>
                    <p className="text-3xl font-bold">{events.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg hover:bg-white/15 transition-all-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-400/20 rounded-xl">
                    <UsersIcon className="h-7 w-7 text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Участников всего</p>
                    <p className="text-3xl font-bold">{totalParticipants.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg hover:bg-white/15 transition-all-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-400/20 rounded-xl">
                    <StarIcon className="h-7 w-7 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Активных событий</p>
                    <p className="text-3xl font-bold">{activeEvents}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 mb-8 border border-gray-100 dark:border-slate-700 transition-theme">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск событий по названию или описанию..."
                className="block w-full pl-13 pr-12 py-4 text-lg border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all-sm placeholder-gray-400 dark:placeholder-gray-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-all-sm"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-gray-100 dark:border-slate-700 transition-theme">
              <ArrowPathIcon className="h-14 w-14 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">Загрузка событий...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 mb-8 transition-theme">
              <p className="text-red-800 dark:text-red-300 font-medium">{error}</p>
              <button
                onClick={loadEvents}
                className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline font-medium"
              >
                Попробовать снова
              </button>
            </div>
          )}

          {/* Events Grid */}
          {!loading && filteredEvents.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-elevated transition-all-lg group"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-all-sm">
                          {event.name}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {event.description || 'Без описания'}
                        </p>
                      </div>
                      <span className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(event.status)}`}>
                        {event.status_display}
                      </span>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      {event.has_online_sessions && (
                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                          <VideoCameraIcon className="h-3.5 w-3.5 mr-1.5" />
                          Онлайн-сессии
                        </span>
                      )}
                      {event.has_offline_sessions && (
                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                          <MapPinIcon className="h-3.5 w-3.5 mr-1.5" />
                          Офлайн-сессии
                        </span>
                      )}
                      {!event.is_active && (
                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                          Неактивно
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 rounded-xl">
                          <CalendarIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Создано</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDate(event.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 rounded-xl">
                          <UserIcon className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Организатор</p>
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
                            {event.owner.full_name || event.owner.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-100 rounded-xl">
                          <UsersIcon className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Участников</p>
                          <p className="text-lg font-bold text-purple-600">
                            {event.participants_count}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-100 rounded-xl">
                          <TrophyIcon className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Статус</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {event.is_open ? 'Открыто' : 'Закрыто'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Statistics Button */}
                    <button
                      onClick={() => handleViewStatistics(event.id)}
                      className="w-full py-4 px-6 gradient-primary hover:shadow-glow text-white font-semibold rounded-xl transition-all-lg transform hover:scale-[1.02] flex items-center justify-center gap-3"
                    >
                      <ChartBarIcon className="h-6 w-6" />
                      Посмотреть статистику
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && filteredEvents.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-100">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                <ChartBarIcon className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-600 text-lg mb-4 font-medium">
                {searchTerm ? 'События не найдены' : 'События пока отсутствуют'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-blue-600 hover:text-blue-800 font-semibold transition-all-sm"
                >
                  Сбросить поиск
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
