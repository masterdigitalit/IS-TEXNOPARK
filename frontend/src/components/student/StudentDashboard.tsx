// src/components/dashboards/StudentDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  CalendarDaysIcon,
  ClockIcon,
  TrophyIcon,
  UserGroupIcon,
  VideoCameraIcon,
  MapPinIcon,
  UserIcon,
  ArrowRightIcon,
  CalendarIcon,
  FireIcon,
  StarIcon,
  BuildingOfficeIcon,
  ChartBarIcon
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
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  created_at: string;
  closes_at: string | null;
  image_url: string | null;
  is_active: boolean;
  is_open: boolean;
  has_online_sessions: boolean;
  has_offline_sessions: boolean;
  online_sessions_count: number;
  offline_sessions_count: number;
  participants_count: number;
  is_private: boolean;
  // Информация о текущем пользователе
  current_user_participation?: {
    id: number;
    role: string;
    is_confirmed: boolean;
    registered_at: string;
  };
}

interface DashboardStats {
  total_events: number;
  upcoming_events: number;
  ongoing_events: number;
  total_participants: number;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // Состояния
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'ongoing' | 'past' | 'my'>('upcoming');
  
  // Данные
  const [events, setEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_events: 0,
    upcoming_events: 0,
    ongoing_events: 0,
    total_participants: 0
  });
  
  // Загрузка данных
  const loadDashboardData = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Загружаем события, где пользователь участвует
      const participatingResponse = await apiClient.get<{ results: Event[] }>('/api/v1/events/events/participating/');
      const participatingEvents = participatingResponse.results || [];
      
      // Загружаем события пользователя (где он организатор)
      const myEventsResponse = await apiClient.get<{ results: Event[] }>('/api/v1/events/events/my/');
      const myEvents = myEventsResponse.results || [];
      
      // Загружаем предстоящие события
      const upcomingResponse = await apiClient.get<{ results: Event[] }>('/api/v1/events/events/upcoming/');
      const upcomingEvents = upcomingResponse.results || [];
      
      // Объединяем все события, убирая дубликаты
      const allEvents = [...participatingEvents, ...upcomingEvents];
      const uniqueEvents = allEvents.filter(
        (event, index, self) => index === self.findIndex(e => e.id === event.id)
      );
      
      // Фильтруем события по статусу участия
      const upcoming = uniqueEvents.filter(event => 
        event.status === 'published' && 
        event.is_active &&
        event.is_open &&
        (!event.closes_at || new Date(event.closes_at) > new Date())
      );
      
      const ongoing = uniqueEvents.filter(event => 
        event.status === 'published' && 
        event.is_active &&
        event.has_online_sessions
      );
      
      // Вычисляем статистику
      const totalParticipants = participatingEvents.reduce((sum, event) => sum + event.participants_count, 0);
      
      setEvents(uniqueEvents);
      setMyEvents(myEvents);
      setStats({
        total_events: uniqueEvents.length,
        upcoming_events: upcoming.length,
        ongoing_events: ongoing.length,
        total_participants: totalParticipants
      });
      
    } catch (err: any) {
      console.error('Ошибка загрузки данных дашборда:', err);
      setError(err.message || 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);
  
  // Обработчики
  const handleNavigateToEvent = (eventId: number) => {
    navigate(`/user/events/${eventId}`);
  };
  
  const handleNavigateToCreateEvent = () => {
    navigate('/admin/events/create');
  };
  
  const handleRefresh = () => {
    loadDashboardData();
  };
  
  // Фильтрация событий по активной вкладке
  const getFilteredEvents = () => {
    const now = new Date();
    
    switch (activeTab) {
      case 'upcoming':
        return events.filter(event => 
          event.status === 'published' && 
          event.is_active &&
          event.is_open &&
          (!event.closes_at || new Date(event.closes_at) > now)
        ).sort((a, b) => {
          const dateA = a.closes_at ? new Date(a.closes_at) : new Date(a.created_at);
          const dateB = b.closes_at ? new Date(b.closes_at) : new Date(b.created_at);
          return dateA.getTime() - dateB.getTime();
        });
      
      case 'ongoing':
        return events.filter(event => 
          event.status === 'published' && 
          event.is_active &&
          event.has_online_sessions
        ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      case 'past':
        return events.filter(event => 
          event.status === 'completed' || 
          !event.is_active ||
          (event.closes_at && new Date(event.closes_at) < now)
        ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      case 'my':
        return myEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      default:
        return events;
    }
  };
  
  // Форматирование
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не указана';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
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
  
  const getEventStatus = (event: Event) => {
    if (event.current_user_participation) {
      if (event.owner.id === user?.id) {
        return { text: 'Организатор', color: 'bg-blue-100 text-blue-800' };
      }
      if (event.current_user_participation.is_confirmed) {
        return { text: 'Участник', color: 'bg-green-100 text-green-800' };
      }
      return { text: 'Ожидает подтверждения', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { text: 'Доступно для регистрации', color: 'bg-gray-100 text-gray-800' };
  };
  
  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Требуется авторизация</h2>
          <p className="text-yellow-700 mb-4">Для просмотра панели студента необходимо войти в систему</p>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Войти в систему
          </Link>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Загрузка данных панели...</p>
        </div>
      </div>
    );
  }
  
  const filteredEvents = getFilteredEvents();
  
  return (
    <div className="p-6">
      {/* Заголовок */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Панель конференций</h1>
            <p className="text-gray-600 mt-2">
              {user?.full_name ? `Добро пожаловать, ${user.full_name}!` : 'Ваши конференции и мероприятия'}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            >
              Обновить
            </button>
            <button
              onClick={handleNavigateToCreateEvent}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Создать конференцию
            </button>
          </div>
        </div>
      </div>
      
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg mr-4">
              <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Всего конференций</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_events}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg mr-4">
              <ClockIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Предстоящих</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcoming_events}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg mr-4">
              <VideoCameraIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Идет сейчас</p>
              <p className="text-2xl font-bold text-gray-900">{stats.ongoing_events}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-50 rounded-lg mr-4">
              <UserGroupIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Всего участников</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_participants}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Ошибка */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-800 font-medium">{error}</span>
          </div>
          <button 
            onClick={handleRefresh}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Попробовать снова
          </button>
        </div>
      )}
      
      {/* Основной контент */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Список конференций */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Табы */}
            <div className="border-b border-gray-200">
              <nav className="flex overflow-x-auto">
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'upcoming'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <CalendarDaysIcon className="h-4 w-4 mr-2" />
                    Предстоящие
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {stats.upcoming_events}
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('ongoing')}
                  className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'ongoing'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <FireIcon className="h-4 w-4 mr-2" />
                    Идут сейчас
                    <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                      {stats.ongoing_events}
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('my')}
                  className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'my'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 mr-2" />
                    Мои конференции
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      {myEvents.length}
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('past')}
                  className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'past'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Прошедшие
                  </div>
                </button>
              </nav>
            </div>
            
            {/* Список конференций */}
            <div className="p-6">
              {filteredEvents.length > 0 ? (
                <div className="space-y-4">
                  {filteredEvents.map((event) => {
                    const statusInfo = getEventStatus(event);
                    const isOwner = event.owner.id === user?.id;
                    const isParticipant = !!event.current_user_participation;
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => handleNavigateToEvent(event.id)}
                        className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-start">
                              <div>
                                <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600">
                                  {event.name}
                                </h3>
                                {event.description && (
                                  <p className="text-gray-600 mt-1 text-sm line-clamp-2">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                              
                              {event.is_private && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  Приватная
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center mt-3 space-x-4">
                              {/* Организатор */}
                              <div className="flex items-center text-sm text-gray-600">
                                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                                  <UserIcon className="h-3 w-3 text-blue-600" />
                                </div>
                                <span>{event.owner.full_name || event.owner.email}</span>
                              </div>
                              
                              {/* Дата */}
                              {event.closes_at && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <CalendarDaysIcon className="h-4 w-4 mr-1 text-gray-400" />
                                  <span>До {formatDate(event.closes_at)}</span>
                                </div>
                              )}
                              
                              {/* Участники */}
                              <div className="flex items-center text-sm text-gray-600">
                                <UserGroupIcon className="h-4 w-4 mr-1 text-gray-400" />
                                <span>{event.participants_count}</span>
                              </div>
                              
                              {/* Сессии */}
                              <div className="flex items-center space-x-2">
                                {event.has_online_sessions && (
                                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                    <VideoCameraIcon className="h-3 w-3 mr-1" />
                                    Онлайн
                                  </span>
                                )}
                                {event.has_offline_sessions && (
                                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                    <MapPinIcon className="h-3 w-3 mr-1" />
                                    Офлайн
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end space-y-2 ml-4">
                            {/* Статус участия */}
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.text}
                            </span>
                            
                            {/* Кнопка перехода */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigateToEvent(event.id);
                              }}
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Перейти
                              <ArrowRightIcon className="h-4 w-4 ml-1" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Дополнительная информация для текущих событий */}
                        {activeTab === 'ongoing' && event.has_online_sessions && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center text-sm text-gray-700">
                              <FireIcon className="h-4 w-4 text-orange-500 mr-2" />
                              <span>Сейчас проходят онлайн-сессии</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Быстрый доступ для организатора */}
                        {isOwner && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex space-x-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/events/${event.id}`);
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Управление конференцией
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/conference/${event.id}`);
                                }}
                                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                              >
                                Перейти в конференцию
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    {activeTab === 'upcoming' ? (
                      <CalendarDaysIcon className="h-6 w-6 text-gray-400" />
                    ) : activeTab === 'ongoing' ? (
                      <FireIcon className="h-6 w-6 text-gray-400" />
                    ) : activeTab === 'my' ? (
                      <UserIcon className="h-6 w-6 text-gray-400" />
                    ) : (
                      <CalendarIcon className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {activeTab === 'upcoming' && 'Нет предстоящих конференций'}
                    {activeTab === 'ongoing' && 'Сейчас нет активных конференций'}
                    {activeTab === 'my' && 'Вы еще не создали конференции'}
                    {activeTab === 'past' && 'Нет прошедших конференций'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {activeTab === 'upcoming' && 'Конференции, в которых вы участвуете или можете участвовать, появятся здесь'}
                    {activeTab === 'ongoing' && 'Конференции с активными онлайн-сессиями появятся здесь'}
                    {activeTab === 'my' && 'Создайте свою первую конференцию или станьте участником'}
                    {activeTab === 'past' && 'Прошедшие конференции появятся здесь'}
                  </p>
                  
                  {activeTab === 'upcoming' && (
                    <Link
                      to="/user/events"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Найти конференции
                    </Link>
                  )}
                  
                  {activeTab === 'my' && (
                    <button
                      onClick={handleNavigateToCreateEvent}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Создать конференцию
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Боковая панель */}
        <div className="space-y-6">
          {/* Информация о пользователе */}
         
          
          {/* Быстрые действия */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h3>
            <div className="space-y-3">
              <button
                onClick={handleNavigateToCreateEvent}
                className="w-full flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
              >
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <CalendarDaysIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium">Создать конференцию</span>
                </div>
                <ArrowRightIcon className="h-4 w-4" />
              </button>
              
              <Link
                to="/user/events"
                className="w-full flex items-center justify-between p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
              >
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <ChartBarIcon className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-medium">Найти конференции</span>
                </div>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              
              <Link
                to={`/profile`}
                className="w-full flex items-center justify-between p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100"
              >
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                    <UserIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="font-medium">Мой профиль</span>
                </div>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
          
          {/* Активные сессии */}
          {stats.ongoing_events > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Активные сейчас</h3>
              <div className="space-y-3">
                {events
                  .filter(event => event.status === 'published' && event.has_online_sessions)
                  .slice(0, 3)
                  .map(event => (
                    <div
                      key={event.id}
                      onClick={() => handleNavigateToEvent(event.id)}
                      className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer"
                    >
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                          <VideoCameraIcon className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 truncate">{event.name}</div>
                          <div className="text-xs text-gray-500">
                            {event.online_sessions_count} онлайн-сессий
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;