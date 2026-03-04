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
      case 'published': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <ChartBarIcon className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Отчеты и аналитика</h1>
                <p className="text-purple-100 mt-1 text-lg">
                  Просмотр статистики и результатов событий
                </p>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <TrophyIcon className="h-6 w-6 text-yellow-300" />
                  <div>
                    <p className="text-purple-100 text-sm">Всего событий</p>
                    <p className="text-2xl font-bold">{events.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <UsersIcon className="h-6 w-6 text-green-300" />
                  <div>
                    <p className="text-purple-100 text-sm">Участников всего</p>
                    <p className="text-2xl font-bold">
                      {events.reduce((sum, e) => sum + e.participants_count, 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <StarIcon className="h-6 w-6 text-blue-300" />
                  <div>
                    <p className="text-purple-100 text-sm">Активных событий</p>
                    <p className="text-2xl font-bold">
                      {events.filter(e => e.is_active && e.status === 'published').length}
                    </p>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск событий по названию или описанию..."
                className="block w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <ArrowPathIcon className="h-12 w-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Загрузка событий...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <p className="text-red-800 font-medium">{error}</p>
              <button
                onClick={loadEvents}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
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
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {event.name}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {event.description || 'Без описания'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                        {event.status_display}
                      </span>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {event.has_online_sessions && (
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          <VideoCameraIcon className="h-3 w-3 mr-1" />
                          Онлайн-сессии
                        </span>
                      )}
                      {event.has_offline_sessions && (
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          <MapPinIcon className="h-3 w-3 mr-1" />
                          Офлайн-сессии
                        </span>
                      )}
                      {!event.is_active && (
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          Неактивно
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <CalendarIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Создано</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(event.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <UserIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Организатор</p>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                            {event.owner.full_name || event.owner.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <UsersIcon className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Участников</p>
                          <p className="text-sm font-bold text-purple-600">
                            {event.participants_count}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <TrophyIcon className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Статус</p>
                          <p className="text-sm font-medium text-gray-900">
                            {event.is_open ? 'Открыто' : 'Закрыто'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Statistics Button */}
                    <button
                      onClick={() => handleViewStatistics(event.id)}
                      className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-3"
                    >
                      <ChartBarIcon className="h-6 w-6" />
                      Посмотреть статистику
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && filteredEvents.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-4">
                {searchTerm ? 'События не найдены' : 'События пока отсутствуют'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-purple-600 hover:text-purple-800 font-medium"
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
