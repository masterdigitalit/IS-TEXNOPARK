// src/components/admin/events/EventList.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api-client';
import { 
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  VideoCameraIcon,
  MapPinIcon,
  LinkIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  UsersIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Типы данных
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
    avatar_url?: string | null;
  };
  owner_id: number;
  created_at: string;
  closes_at: string | null;
  registration_ends_at?: string | null;
  image_url: string | null;
  is_active: boolean;
  is_open: boolean;
  is_private?: boolean;
  has_online_sessions: boolean;
  has_offline_sessions: boolean;
  participants_count: number;
  online_sessions_count?: number;
  offline_sessions_count?: number;
  files_count?: number;
  slug?: string;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Event[];
}

interface EventFilters {
  status?: string;
  is_active?: boolean;
  is_open?: boolean;
  is_private?: boolean;
  owner?: number;
  closes_after?: string;
  closes_before?: string;
  search?: string;
  ordering?: string;
  has_online_sessions?: boolean;
  has_offline_sessions?: boolean;
}

export const EventListPublic: React.FC = () => {
  const navigate = useNavigate();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<EventFilters>({});
  const pageSize = 15;

  // Загрузка событий
  const loadEvents = async (pageNumber = 1) => {
    setLoading(true);
    setError('');
    
    try {
      const requestParams: any = {
        page: pageNumber,
        page_size: pageSize,
        ...filters
      };
      
      if (searchTerm.trim()) {
        requestParams.search = searchTerm.trim();
      }
      
      // Очищаем пустые параметры
      Object.keys(requestParams).forEach(key => {
        if (requestParams[key] === undefined || requestParams[key] === '') {
          delete requestParams[key];
        }
      });
      
      // Собираем query string
      const queryString = Object.keys(requestParams)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(requestParams[key])}`)
        .join('&');
      
      const url = `/api/v1/events/all/${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get<ApiResponse>(url);
      
      setEvents(response.results);
      setTotalCount(response.count);
      setTotalPages(Math.ceil(response.count / pageSize));
      setPage(pageNumber);
      
    } catch (err: any) {
      console.error('Ошибка загрузки событий:', err);
      setError(err.message || 'Не удалось загрузить события');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents(1);
  }, [filters]);

  const handlePrevPage = () => {
    if (page > 1) loadEvents(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) loadEvents(page + 1);
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      setFilters(prev => ({
        ...prev,
        search: searchTerm.trim()
      }));
    } else {
      const { search, ...otherFilters } = filters;
      setFilters(otherFilters);
    }
    setPage(1);
  };

  const handleFilterChange = (key: keyof EventFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPage(1);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не указана';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return 'Не указана';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Расчет статистики
  const stats = useMemo(() => {
    return {
      total: totalCount,
      active: events.filter(e => e.is_active).length,
      published: events.filter(e => e.status === 'published').length,
      withOnline: events.filter(e => e.has_online_sessions).length,
      withOffline: events.filter(e => e.has_offline_sessions).length,
      privateEvents: events.filter(e => e.is_private).length || 0
    };
  }, [events, totalCount]);

  // Количество активных фильтров
  const activeFiltersCount = useMemo(() => {
    return Object.keys(filters).filter(key => filters[key as keyof EventFilters] !== undefined).length;
  }, [filters]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-6">
      {/* Хедер */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">События</h1>
            <p className="text-gray-600">Всего событий: {totalCount}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => loadEvents(page)}
              disabled={loading}
              className="inline-flex items-center px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow"
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
            <button
              onClick={() => navigate('/admin/events/create')}
              className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Создать событие
            </button>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Всего событий</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Активных</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Опубликовано</div>
          <div className="text-2xl font-bold text-blue-600">{stats.published}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">С онлайн</div>
          <div className="text-2xl font-bold text-purple-600">{stats.withOnline}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">С офлайн</div>
          <div className="text-2xl font-bold text-amber-600">{stats.withOffline}</div>
        </div>
      </div>

      {/* Панель поиска и фильтров */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Поиск событий
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="Название, описание, организатор..."
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Найти
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              Фильтры {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="pt-5 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Статус
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Все статусы</option>
                  <option value="draft">Черновик</option>
                  <option value="published">Опубликовано</option>
                  <option value="cancelled">Отменено</option>
                  <option value="completed">Завершено</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Активность
                </label>
                <select
                  value={filters.is_active?.toString() || ''}
                  onChange={(e) => handleFilterChange('is_active', e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined)}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Все</option>
                  <option value="true">Активные</option>
                  <option value="false">Неактивные</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сортировка
                </label>
                <select
                  value={filters.ordering || '-created_at'}
                  onChange={(e) => handleFilterChange('ordering', e.target.value || undefined)}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="-created_at">Новые сначала</option>
                  <option value="created_at">Старые сначала</option>
                  <option value="name">Название (А-Я)</option>
                  <option value="-name">Название (Я-А)</option>
                  <option value="-closes_at">Ближайшие к закрытию</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <button
                onClick={handleResetFilters}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Сбросить все фильтры
              </button>
              <button
                onClick={() => {
                  handleSearch();
                  setShowFilters(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Применить фильтры
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
          <button 
            onClick={() => loadEvents(page)}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Загрузка событий...</p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {searchTerm && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-700">
                  Найдено {events.length} событий по запросу "{searchTerm}"
                </div>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    const { search, ...otherFilters } = filters;
                    setFilters(otherFilters);
                    setPage(1);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  × Очистить поиск
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Событие
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Организатор
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Регистрация до
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Участники
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сессии
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map(event => (
                  <tr 
                    key={event.id} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <span className="hover:text-blue-600 cursor-pointer" onClick={() => window.open(`events/${event.id}`, '_blank')}>
                            {event.name}
                          </span>
                          {event.is_private && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              Приватное
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 truncate max-w-md">
                          {event.description || 'Без описания'}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <UserIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {event.owner.full_name || event.owner.username}
                          </div>
                          <div className="text-xs text-gray-500">
                            {event.owner.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        {/* <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                          {event.status_display}
                        </span> */}
                        <div className={`text-xs px-2 py-1 rounded ${event.is_open ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                          {event.is_open ? 'Регистрация открыта' : 'Регистрация закрыта'}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {event.registration_ends_at ? (
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="font-medium">{formatShortDate(event.registration_ends_at)}</span>
                          </div>
                        ) : event.closes_at ? (
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="font-medium">{formatShortDate(event.closes_at)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                      {event.closes_at && event.closes_at !== event.registration_ends_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          Событие до: {formatShortDate(event.closes_at)}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <UsersIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-xl font-bold text-gray-900">
                            {event.participants_count}
                          </div>
                          {/* {event.files_count !== undefined && event.files_count > 0 && (
                            <div className="text-xs text-gray-500">
                              файлов: {event.files_count}
                            </div>
                          )} */}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {event.has_online_sessions && (
                          <div className="flex items-center text-sm text-purple-700 bg-purple-50 px-2 py-1 rounded">
                            <VideoCameraIcon className="h-3 w-3 mr-1" />
                            {event.online_sessions_count || 0}
                          </div>
                        )}
                        {event.has_offline_sessions && (
                          <div className="flex items-center text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded">
                            <MapPinIcon className="h-3 w-3 mr-1" />
                            {event.offline_sessions_count || 0}
                          </div>
                        )}
                        {!event.has_online_sessions && !event.has_offline_sessions && (
                          <span className="text-sm text-gray-400">Нет сессий</span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => window.open(`events/${event.id}`, '_blank')}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Просмотр"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                          className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Редактировать"
                        >
                          {/* <PencilIcon className="h-4 w-4" /> */}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  Показано <span className="font-medium">{events.length}</span> из{' '}
                  <span className="font-medium">{totalCount}</span> событий
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={page === 1}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700">
                    Страница {page} из {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={page === totalPages}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && events.length === 0 && !error && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? `События по запросу "${searchTerm}" не найдены` : 'События не найдены'}
          </h3>
          <p className="text-gray-600 mb-4">
            {Object.keys(filters).length > 0 
              ? 'Попробуйте изменить параметры фильтрации' 
              : 'Создайте первое событие для начала работы'
            }
          </p>
          {Object.keys(filters).length > 0 ? (
            <button
              onClick={handleResetFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Сбросить фильтры
            </button>
          ) : (
            <button
              onClick={() => navigate('/admin/events/create')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Создать первое событие
            </button>
          )}
        </div>
      )}
    </div>
  );
};