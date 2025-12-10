// src/components/admin/events/EventList.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api-client';
import { 
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChartBarIcon,
  VideoCameraIcon,
  MapPinIcon
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
  online_sessions_count?: number;
  offline_sessions_count?: number;
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
  owner?: number;
  closes_after?: string;
  closes_before?: string;
  search?: string;
  ordering?: string;
}

export const EventList: React.FC = () => {
  const navigate = useNavigate();
  
  // Состояния
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
      const params: any = {
        page: pageNumber,
        page_size: pageSize,
        ...filters
      };
      
      // Добавляем поиск если есть
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await apiClient.get<ApiResponse>('/api/v1/events/', { params });
      
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

  // Обработчики
  const handlePrevPage = () => {
    if (page > 1) loadEvents(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) loadEvents(page + 1);
  };

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm || undefined
    }));
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

  const toggleEventStatus = async (eventId: number, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/api/v1/events/${eventId}/`, {
        is_active: !currentStatus,
      });
      
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { ...event, is_active: !currentStatus }
            : event
        )
      );
      
    } catch (err: any) {
      setError(err.message || 'Не удалось обновить статус');
    }
  };

  const changeEventStatus = async (eventId: number, newStatus: Event['status']) => {
    try {
      await apiClient.patch(`/api/v1/events/${eventId}/`, {
        status: newStatus,
      });
      
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { 
                ...event, 
                status: newStatus,
                status_display: newStatus === 'published' ? 'Опубликовано' :
                              newStatus === 'draft' ? 'Черновик' :
                              newStatus === 'cancelled' ? 'Отменено' : 'Завершено'
              }
            : event
        )
      );
      
    } catch (err: any) {
      setError(err.message || 'Не удалось изменить статус');
    }
  };

  const deleteEvent = async (eventId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить это событие? Это действие нельзя отменить.')) {
      return;
    }
    
    try {
      await apiClient.delete(`/api/v1/events/${eventId}/`);
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      setTotalCount(prev => prev - 1);
      
    } catch (err: any) {
      setError(err.message || 'Не удалось удалить событие');
    }
  };

  // Навигация
  const navigateToEventDetails = (eventId: number) => {
    navigate(`/admin/events/${eventId}`);
  };

  const navigateToCreateEvent = () => {
    navigate('/admin/events/create');
  };

  const navigateToEventEdit = (eventId: number) => {
    navigate(`/admin/events/${eventId}/edit`);
  };

  // Форматирование
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не указана';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Статистика
  const activeEvents = events.filter(e => e.is_active).length;
  const publishedEvents = events.filter(e => e.status === 'published').length;
  const draftEvents = events.filter(e => e.status === 'draft').length;
  const eventsWithOnline = events.filter(e => e.has_online_sessions).length;

  // Получение цвета статуса
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
    <div className="p-6">
      {/* Заголовок и кнопки */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление событиями</h1>
          <p className="text-gray-600 mt-1">Всего событий: {totalCount}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => loadEvents(page)}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
          <button
            onClick={navigateToCreateEvent}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Создать событие
          </button>
        </div>
      </div>

      {/* Панель статистики */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Всего событий</div>
          <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Активных</div>
          <div className="text-2xl font-bold text-green-600">{activeEvents}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Опубликовано</div>
          <div className="text-2xl font-bold text-blue-600">{publishedEvents}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">С онлайн-сессиями</div>
          <div className="text-2xl font-bold text-purple-600">{eventsWithOnline}</div>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Поиск по названию или описанию..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Найти
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            Фильтры
          </button>
        </div>

        {showFilters && (
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Статус
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Все статусы</option>
                  <option value="draft">Черновик</option>
                  <option value="published">Опубликовано</option>
                  <option value="cancelled">Отменено</option>
                  <option value="completed">Завершено</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Активность
                </label>
                <select
                  value={filters.is_active?.toString() || ''}
                  onChange={(e) => handleFilterChange('is_active', e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Все</option>
                  <option value="true">Активные</option>
                  <option value="false">Неактивные</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сортировка
                </label>
                <select
                  value={filters.ordering || ''}
                  onChange={(e) => handleFilterChange('ordering', e.target.value || undefined)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">По умолчанию</option>
                  <option value="created_at">Дата создания (старые)</option>
                  <option value="-created_at">Дата создания (новые)</option>
                  <option value="name">Название (A-Z)</option>
                  <option value="-name">Название (Z-A)</option>
                  <option value="closes_at">Дата закрытия (ранние)</option>
                  <option value="-closes_at">Дата закрытия (поздние)</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleResetFilters}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-600 mr-3" />
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

      {/* Загрузка */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Загрузка событий...</p>
        </div>
      )}

      {/* Таблица событий */}
      {!loading && events.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Событие
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Организатор
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Даты
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Участники
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сессии
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map(event => (
                <tr 
                  key={event.id} 
                
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-6 py-4"   onClick={() => navigateToEventDetails(event.id)}>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center">
                        {event.name}
                        {!event.is_active && (
                          <span className="ml-2 text-xs text-gray-500">(неактивно)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-md">
                        {event.description || 'Без описания'}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <UserIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
												
                        <div className="text-sm font-medium text-gray-900"   onClick={() => navigate('/admin/users/'+event.owner.id)}>
                          {event.owner.full_name || event.owner.username}
                        </div>
                        <div className="text-xs text-gray-500">
                          {event.owner.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {/* <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                        {event.status_display}
                      </span> */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        event.is_open 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {event.is_open ? 'Открыто' : 'Закрыто'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span>Создано: {formatDate(event.created_at)}</span>
                      </div>
                      {event.closes_at && (
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span>Закрытие: {formatDate(event.closes_at)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {event.participants_count}
                      </div>
                      <div className="text-xs text-gray-500">участников</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {event.has_online_sessions && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          <VideoCameraIcon className="h-3 w-3 mr-1" />
                          Онлайн
                        </span>
                      )}
                      {event.has_offline_sessions &&(
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          <MapPinIcon className="h-3 w-3 mr-1" />
                          Офлайн
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      {/* Просмотр */}
                      <button
                        onClick={() => navigateToEventDetails(event.id)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Просмотр"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      
                      {/* Редактирование */}
                      <button
                        onClick={() => navigateToEventEdit(event.id)}
                        className="text-green-600 hover:text-green-900 p-1"
                        title="Редактировать"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      
                      {/* Изменение статуса */}
                      {event.status !== 'published' ? (
                        <button
                          onClick={() => changeEventStatus(event.id, 'published')}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Опубликовать"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => changeEventStatus(event.id, 'draft')}
                          className="text-yellow-600 hover:text-yellow-900 p-1"
                          title="В черновик"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      )}
                      
                      {/* Активация/деактивация */}
                      {event.is_active ? (
                        <button
                          onClick={() => toggleEventStatus(event.id, event.is_active)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Деактивировать"
                        >
                          ×
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleEventStatus(event.id, event.is_active)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Активировать"
                        >
                          ✓
                        </button>
                      )}
                      
                      {/* Удаление */}
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Удалить"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Показано <span className="font-medium">{events.length}</span> из{' '}
                  <span className="font-medium">{totalCount}</span> событий
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={page === 1}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700">
                    Страница {page} из {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={page === totalPages}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Нет данных */}
      {!loading && events.length === 0 && !error && (
        <div className="text-center py-12">
          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">События не найдены</p>
          {Object.keys(filters).length > 0 ? (
            <button
              onClick={handleResetFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Сбросить фильтры
            </button>
          ) : (
            <button
              onClick={navigateToCreateEvent}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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