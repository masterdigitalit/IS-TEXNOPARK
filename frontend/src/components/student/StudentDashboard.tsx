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
  ChartBarIcon,
  CheckCircleIcon,
  PlusIcon,
  XCircleIcon,
  PlayCircleIcon,
  PauseCircleIcon,
  ComputerDesktopIcon,
  BuildingLibraryIcon,
  ExclamationCircleIcon,
  BellAlertIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// Типы данных
interface EventSession {
  id: number;
  session_name: string;
  start_time: string;
  end_time: string | null;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  is_ongoing: boolean;
  is_upcoming: boolean;
  is_past: boolean;
  platform?: string;
  address?: string;
  room?: string;
}

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
  is_private: boolean;
  registration_ends_at: string | null;
  results_published_at: string | null;
  
  // Статистика
  online_sessions_count: number;
  offline_sessions_count: number;
  participants_count: number;
  
  // Сессии
  upcoming_online_sessions?: EventSession[];
  upcoming_offline_sessions?: EventSession[];
  
  // Статусы для отображения
  registration_status?: {
    status: string;
    display: string;
    is_active: boolean;
    is_ended: boolean;
  };
  results_status?: {
    status: string;
    display: string;
    is_published: boolean;
  };
  sessions_status?: {
    is_ongoing: boolean;
    has_scheduled: boolean;
    display: string;
    online_count: number;
    offline_count: number;
  };
  current_stage?: {
    name: string;
    display: string;
    status: 'active' | 'pending' | 'completed' | 'unknown';
    detail?: string;
  };
  
  // Информация о текущем пользователе
  current_user_participation?: {
    id: number;
    role: string;
    role_display: string;
    is_confirmed: boolean;
    registered_at: string;
  };
}

interface DashboardStats {
  total_events: number;
  upcoming_events: number;
  ongoing_sessions: number;
  total_participants: number;
  total_sessions: number;
  ongoing_events: number;
}

// Вспомогательные компоненты
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  darkColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, darkColor }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 transition-all-sm hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value.toLocaleString()}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]} ${darkColor || ''} transition-transform-sm hover:scale-110`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  color: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label, count, color }) => {
  const activeClasses: Record<string, string> = {
    blue: 'border-blue-500 text-blue-600 dark:text-blue-400',
    orange: 'border-orange-500 text-orange-600 dark:text-orange-400',
    green: 'border-green-500 text-green-600 dark:text-green-400',
    gray: 'border-gray-500 text-gray-600 dark:text-gray-400',
  };

  const badgeClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
    gray: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-3.5 font-medium text-sm whitespace-nowrap border-b-2 transition-all-sm ${
        active
          ? activeClasses[color]
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'
      }`}
    >
      <span className="h-4 w-4 mr-2">{icon}</span>
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
          active ? badgeClasses[color] : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
};

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
  const [participatingEvents, setParticipatingEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_events: 0,
    upcoming_events: 0,
    ongoing_sessions: 0,
    total_participants: 0,
    total_sessions: 0,
    ongoing_events: 0
  });
  
  // Вспомогательные функции для определения статусов
  const getEventCurrentStatus = (event: Event) => {
    const now = new Date();
    
    // Проверяем, есть ли активные сессии прямо сейчас
    const hasActiveSessionsNow = [
      ...(event.upcoming_online_sessions || []),
      ...(event.upcoming_offline_sessions || [])
    ].some(session => session.is_ongoing);
    
    if (hasActiveSessionsNow) {
      return 'ongoing_now';
    }
    
    // ВАЖНОЕ ИСПРАВЛЕНИЕ: Если у события есть sessions_status.is_ongoing = true (из API), 
    // значит конференция идет, даже если нет сессий прямо сейчас
    if (event.sessions_status?.is_ongoing) {
      return 'ongoing_event';
    }
    
    // Проверяем, есть ли будущие сессии (которые еще не начались)
    const hasUpcomingSessions = [
      ...(event.upcoming_online_sessions || []),
      ...(event.upcoming_offline_sessions || [])
    ].some(session => session.is_upcoming);
    
    // Проверяем статус регистрации
    const registrationClosed = event.registration_status?.is_ended || false;
    
    // Если регистрация закрыта, но есть будущие сессии - это идет сейчас (в рамках события)
    if (registrationClosed && hasUpcomingSessions) {
      return 'ongoing_event';
    }
    
    // Проверяем, открыта ли регистрация
    if (event.registration_status?.is_active) {
      return 'registration_open';
    }
    
    // Если регистрация закрыта и нет будущих сессий
    if (registrationClosed && !hasUpcomingSessions) {
      return 'registration_closed_no_sessions';
    }
    
    // Если событие активно и опубликовано
    if (event.status === 'published' && event.is_active) {
      // Проверяем, идет ли сессия по current_stage
      if (event.current_stage?.name === 'sessions' && event.current_stage?.status === 'active') {
        return 'ongoing_event';
      }
      return 'published_no_info';
    }
    
    return 'unknown';
  };
  
  // Загрузка данных
  const loadDashboardData = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Загружаем все данные параллельно
      const [eventsData, participatingData, myEventsData] = await Promise.all([
        apiClient.get<Event[]>('/api/v1/events/?status=published&expand=stats').catch(() => []),
        apiClient.get<Event[]>('/api/v1/events/participating/?expand=stats').catch(() => []),
        apiClient.get<Event[]>('/api/v1/events/my/?expand=stats').catch(() => [])
      ]);
      
      const allEvents = Array.isArray(eventsData) ? eventsData : [];
      const participatingEvents = Array.isArray(participatingData) ? participatingData : [];
      const myEvents = Array.isArray(myEventsData) ? myEventsData : [];
      
      // Объединяем все события, убирая дубликаты
      const combinedEvents = [...allEvents, ...participatingEvents, ...myEvents];
      const uniqueEvents = combinedEvents.filter(
        (event, index, self) => index === self.findIndex(e => e.id === event.id)
      );
      
      // Вычисляем статистику
      let ongoingSessionsCount = 0;
      let ongoingEventsCount = 0;
      let totalSessions = 0;
      
      uniqueEvents.forEach(event => {
        // Все сессии события
        const allSessions = [
          ...(event.upcoming_online_sessions || []),
          ...(event.upcoming_offline_sessions || [])
        ];
        
        // Считаем сессии
        totalSessions += allSessions.length;
        
        // Активные сессии прямо сейчас
        const activeSessionsNow = allSessions.filter(session => session.is_ongoing);
        ongoingSessionsCount += activeSessionsNow.length;
        
        // Считаем события, которые "идут сейчас" - ИСПРАВЛЕНО
        const eventStatus = getEventCurrentStatus(event);
        if (eventStatus === 'ongoing_now' || eventStatus === 'ongoing_event') {
          ongoingEventsCount++;
        }
      });
      //######################## taget Participants
      const totalParticipants = uniqueEvents.reduce((sum, event) => sum + event.participants_count, 0);
      
      // Считаем предстоящие события (где регистрация открыта или есть будущие сессии)
      const upcomingEventsCount = uniqueEvents.filter(event => {
        const eventStatus = getEventCurrentStatus(event);
        return eventStatus === 'registration_open' || 
               eventStatus === 'ongoing_event' ||
               eventStatus === 'ongoing_now';
      }).length;
      
      setEvents(uniqueEvents);
      setMyEvents(myEvents);
      setParticipatingEvents(participatingEvents);
      setStats({
        total_events: uniqueEvents.length,
        upcoming_events: upcomingEventsCount,
        ongoing_sessions: ongoingSessionsCount,
        total_participants: totalParticipants,
        total_sessions: totalSessions,
        ongoing_events: ongoingEventsCount
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

  const handleRefresh = () => {
    loadDashboardData();
  };
  
  // Фильтрация событий по активной вкладке
  const getFilteredEvents = () => {
    switch (activeTab) {
      case 'upcoming':
        return events.filter(event => {
          const eventStatus = getEventCurrentStatus(event);
          // Показываем события, которые: имеют открытую регистрацию ИЛИ идут сейчас
          return eventStatus === 'registration_open' || 
                 eventStatus === 'ongoing_now' ||
                 eventStatus === 'ongoing_event';
        }).sort((a, b) => {
          // Приоритет: активные сессии сейчас -> события, которые идут -> с открытой регистрацией
          const priority = (event: Event) => {
            const status = getEventCurrentStatus(event);
            if (status === 'ongoing_now') return 0;
            if (status === 'ongoing_event') return 1;
            return 2;
          };
          
          const aPriority = priority(a);
          const bPriority = priority(b);
          
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
          
          // Затем сортируем по дате ближайшей сессии
          const getNextSessionDate = (event: Event) => {
            const allSessions = [
              ...(event.upcoming_online_sessions || []),
              ...(event.upcoming_offline_sessions || [])
            ].filter(s => s.is_upcoming || s.is_ongoing);
            
            return allSessions.length > 0 
              ? new Date(allSessions[0].start_time).getTime()
              : new Date(event.created_at).getTime();
          };
          
          return getNextSessionDate(a) - getNextSessionDate(b);
        });
      
      case 'ongoing':
        return events.filter(event => {
          const eventStatus = getEventCurrentStatus(event);
          // Показываем только события, которые идут сейчас (включая конференции в процессе)
          return eventStatus === 'ongoing_now' || eventStatus === 'ongoing_event';
        }).sort((a, b) => {
          // Приоритет: активные сессии сейчас -> конференции в процессе
          const priority = (event: Event) => {
            const status = getEventCurrentStatus(event);
            if (status === 'ongoing_now') return 0;
            if (status === 'ongoing_event') return 1;
            return 2;
          };
          
          const aPriority = priority(a);
          const bPriority = priority(b);
          
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
          
          // Затем сортируем по количеству активных сессий
          const getOngoingCount = (event: Event) => 
            [...(event.upcoming_online_sessions || []), ...(event.upcoming_offline_sessions || [])]
              .filter(s => s.is_ongoing).length;
          
          return getOngoingCount(b) - getOngoingCount(a);
        });
      
      case 'past':
        return events.filter(event => {
          // Завершенные события
          if (event.status === 'completed') return true;
          
          // События, где все сессии завершены и регистрация закрыта
          const now = new Date();
          const allSessions = [
            ...(event.upcoming_online_sessions || []),
            ...(event.upcoming_offline_sessions || [])
          ];
          
          if (allSessions.length === 0) {
            // Если нет сессий, проверяем дату закрытия
            if (event.closes_at) {
              return new Date(event.closes_at) < now;
            }
            return false;
          }
          
          // Все сессии завершены
          const allSessionsPast = allSessions.every(session => {
            const endTime = session.end_time ? new Date(session.end_time) : null;
            return endTime && endTime < now;
          });
          
          return allSessionsPast;
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      case 'my':
        return myEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      default:
        return events;
    }
  };
  
  // Форматирование дат и времени
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Не указано';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };
  
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не указано';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };
  
  // Вспомогательные функции
  const getEventStatus = (event: Event) => {
    const eventCurrentStatus = getEventCurrentStatus(event);
    
    if (event.owner.id === user?.id) {
      return { text: 'Организатор', color: 'bg-blue-100 text-blue-800', icon: StarIcon };
    }
    
    // Определяем статус в зависимости от текущего состояния события
    switch (eventCurrentStatus) {
      case 'ongoing_now':
        return { 
          text: 'Сессия идет сейчас', 
          color: 'bg-green-100 text-green-800', 
          icon: PlayCircleIcon 
        };
      
      case 'ongoing_event':
        return { 
          text: 'Конференция идет', 
          color: 'bg-orange-100 text-orange-800', 
          icon: BellAlertIcon 
        };
      
      case 'registration_open':
        if (event.current_user_participation) {
          if (event.current_user_participation.is_confirmed) {
            return { text: 'Участник', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon };
          }
          return { text: 'Ожидает подтверждения', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon };
        }
        return { text: 'Регистрация открыта', color: 'bg-purple-100 text-purple-800', icon: PauseCircleIcon };
      
      case 'registration_closed_no_sessions':
        return { text: 'Регистрация закрыта', color: 'bg-red-100 text-red-800', icon: XCircleIcon };
      
      default:
        return { text: 'Доступ ограничен', color: 'bg-gray-100 text-gray-800', icon: ExclamationCircleIcon };
    }
  };
  
  const getSessionStatus = (session: EventSession) => {
    if (session.is_ongoing) {
      return { text: 'Идет сейчас', color: 'bg-green-100 text-green-800', icon: PlayCircleIcon };
    } else if (session.is_upcoming) {
      return { text: 'Запланирована', color: 'bg-blue-100 text-blue-800', icon: ClockIcon };
    } else if (session.is_past) {
      return { text: 'Завершена', color: 'bg-gray-100 text-gray-800', icon: CheckCircleIcon };
    } else if (session.status === 'cancelled') {
      return { text: 'Отменена', color: 'bg-red-100 text-red-800', icon: XCircleIcon };
    }
    return { text: session.status, color: 'bg-gray-100 text-gray-800', icon: ClockIcon };
  };
  
  const getStageIcon = (stageName: string) => {
    switch (stageName) {
      case 'registration': return { icon: UserGroupIcon, color: 'text-purple-600', bg: 'bg-purple-100' };
      case 'sessions': return { icon: VideoCameraIcon, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'results': return { icon: TrophyIcon, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'preparation': return { icon: BuildingLibraryIcon, color: 'text-green-600', bg: 'bg-green-100' };
      case 'completed': return { icon: CheckCircleIcon, color: 'text-gray-600', bg: 'bg-gray-100' };
      default: return { icon: CalendarDaysIcon, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };
  
  const calculateTimeLeft = (endTime: string | null) => {
    if (!endTime) return '';
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Завершено';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days} д ${hours} ч`;
    if (hours > 0) return `${hours} ч ${minutes} мин`;
    return `${minutes} мин`;
  };
  
  // Получаем все текущие сессии для боковой панели
  const getCurrentSessions = () => {
    const allSessions: Array<{session: EventSession, event: Event}> = [];
    
    events.forEach(event => {
      const allEventSessions = [
        ...(event.upcoming_online_sessions || []),
        ...(event.upcoming_offline_sessions || [])
      ];
      
      allEventSessions.forEach(session => {
        if (session.is_ongoing) {
          allSessions.push({ session, event });
        }
      });
    });
    
    return allSessions.sort((a, b) => 
      new Date(b.session.start_time).getTime() - new Date(a.session.start_time).getTime()
    );
  };
  
  // Функция для получения количества будущих сессий
  const getUpcomingSessionsCount = (event: Event) => {
    return [
      ...(event.upcoming_online_sessions || []),
      ...(event.upcoming_offline_sessions || [])
    ].filter(session => session.is_upcoming).length;
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
  const currentSessions = getCurrentSessions();

  // Получаем события, которые идут (для боковой панели)
  const ongoingEvents = events.filter(event => {
    const eventStatus = getEventCurrentStatus(event);
    return eventStatus === 'ongoing_now' || eventStatus === 'ongoing_event';
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6 transition-theme">
      {/* Заголовок */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Панель конференций</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {user?.full_name ? `${user.full_name}, добро пожаловать!` : 'Управляйте своими конференциями'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all-sm shadow-sm hover:shadow"
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
            <Link
              to="/events/create"
              className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all-sm shadow-md hover:shadow-lg"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Создать конференцию
            </Link>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Всего конференций"
          value={stats.total_events}
          icon={<CalendarDaysIcon className="h-6 w-6" />}
          color="blue"
          darkColor="dark:from-blue-900/30 dark:to-blue-800/30"
        />
        <StatCard
          title="Предстоящие"
          value={stats.upcoming_events}
          icon={<ClockIcon className="h-6 w-6" />}
          color="green"
          darkColor="dark:from-green-900/30 dark:to-green-800/30"
        />
        <StatCard
          title="Идут сейчас"
          value={stats.ongoing_events}
          icon={<FireIcon className="h-6 w-6" />}
          color="orange"
          darkColor="dark:from-orange-900/30 dark:to-orange-800/30"
        />
        <StatCard
          title="Активных сессий"
          value={stats.ongoing_sessions}
          icon={<VideoCameraIcon className="h-6 w-6" />}
          color="purple"
          darkColor="dark:from-purple-900/30 dark:to-purple-800/30"
        />
        <StatCard
          title="Участников"
          value={stats.total_participants}
          icon={<UserGroupIcon className="h-6 w-6" />}
          color="yellow"
          darkColor="dark:from-yellow-900/30 dark:to-yellow-800/30"
        />
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl transition-theme">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
              <span className="text-red-800 dark:text-red-300 font-medium">{error}</span>
            </div>
            <button
              onClick={handleRefresh}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline font-medium"
            >
              Повторить
            </button>
          </div>
        </div>
      )}

      {/* Основной контент */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Список конференций */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-theme">
            {/* Табы */}
            <div className="border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
              <nav className="flex overflow-x-auto scrollbar-hide">
                <TabButton
                  active={activeTab === 'upcoming'}
                  onClick={() => setActiveTab('upcoming')}
                  icon={<CalendarDaysIcon className="h-4 w-4" />}
                  label="Предстоящие"
                  count={stats.upcoming_events}
                  color="blue"
                />
                <TabButton
                  active={activeTab === 'ongoing'}
                  onClick={() => setActiveTab('ongoing')}
                  icon={<FireIcon className="h-4 w-4" />}
                  label="Идут сейчас"
                  count={stats.ongoing_events}
                  color="orange"
                />
                <TabButton
                  active={activeTab === 'my'}
                  onClick={() => setActiveTab('my')}
                  icon={<UserIcon className="h-4 w-4" />}
                  label="Мои"
                  count={myEvents.length}
                  color="green"
                />
                <TabButton
                  active={activeTab === 'past'}
                  onClick={() => setActiveTab('past')}
                  icon={<CalendarIcon className="h-4 w-4" />}
                  label="Прошедшие"
                  color="gray"
                />
              </nav>
            </div>
            
            {/* Список конференций */}
            <div className="p-6">
              {filteredEvents.length > 0 ? (
                <div className="space-y-6">
                  {filteredEvents.map((event) => {
                    const statusInfo = getEventStatus(event);
                    const StatusIcon = statusInfo.icon;
                    const isOwner = event.owner.id === user?.id;
                    const stageInfo = event.current_stage;
                    const StageIcon = stageInfo ? getStageIcon(stageInfo.name).icon : CalendarDaysIcon;
                    const eventCurrentStatus = getEventCurrentStatus(event);
                    
                    // Все сессии события
                    const allSessions = [
                      ...(event.upcoming_online_sessions || []).map(s => ({ ...s, type: 'online' as const })),
                      ...(event.upcoming_offline_sessions || []).map(s => ({ ...s, type: 'offline' as const }))
                    ];
                    
                    // Сортируем сессии по времени
                    const sortedSessions = allSessions.sort((a, b) => 
                      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                    );
                    
                    // Будущие сессии
                    const upcomingSessions = sortedSessions.filter(s => s.is_upcoming);
                    // Активные сессии сейчас
                    const activeSessionsNow = sortedSessions.filter(s => s.is_ongoing);
                    
                    return (
                      <div
                        key={event.id}
                        className={`border rounded-xl p-5 transition-all ${
                          eventCurrentStatus === 'ongoing_now' 
                            ? 'border-green-300 bg-green-50' 
                            : eventCurrentStatus === 'ongoing_event'
                            ? 'border-orange-300 bg-orange-50'
                            : 'border-gray-200 bg-white'
                        } hover:shadow-sm`}
                      >
                        {/* Заголовок и статусы */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-2 mb-2">
                              <h3 className="font-bold text-lg text-gray-900">
                                {event.name}
                              </h3>
                              
                              {/* Бейдж "Идет сейчас" для событий с активными сессиями */}
                              {eventCurrentStatus === 'ongoing_now' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  <PlayCircleIcon className="h-3 w-3 mr-1" />
                                  Идет сессия
                                </span>
                              )}
                              
                              {/* Бейдж "Конференция идет" для событий в процессе */}
                              {eventCurrentStatus === 'ongoing_event' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                  <BellAlertIcon className="h-3 w-3 mr-1" />
                                  Конференция идет
                                </span>
                              )}
                              
                              {event.is_private && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  🔒 Приватная
                                </span>
                              )}
                            </div>
                            
                            {event.description && (
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                            
                            {/* Основные метрики */}
                            <div className="flex flex-wrap gap-3 mb-3">
                              {/* Статус участия */}
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo.text}
                              </span>
                              
                              {/* Текущий этап */}
                              {stageInfo && (
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800`}>
                                  <StageIcon className="h-3 w-3 mr-1" />
                                  {stageInfo.display}
                                  {stageInfo.detail && ` (${stageInfo.detail})`}
                                </span>
                              )}
                              
                              {/* Регистрация */}
                              {event.registration_status && (
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  event.registration_status.is_active 
                                    ? 'bg-green-100 text-green-800' 
                                    : event.registration_status.is_ended
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {event.registration_status.is_ended 
                                    ? 'Регистрация закрыта' 
                                    : event.registration_status.display}
                                </span>
                              )}
                              
                              {/* Активные сессии сейчас */}
                              {activeSessionsNow.length > 0 && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <PlayCircleIcon className="h-3 w-3 mr-1" />
                                  {activeSessionsNow.length} активных сессий
                                </span>
                              )}
                              
                              {/* Будущие сессии */}
                              {upcomingSessions.length > 0 && eventCurrentStatus === 'ongoing_event' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <VideoCameraIcon className="h-3 w-3 mr-1" />
                                  {upcomingSessions.length} будущих сессий
                                </span>
                              )}
                            </div>
                            
                            {/* Организатор и даты */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                              <div className="flex items-center">
                                <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                                  <UserIcon className="h-3 w-3 text-blue-600" />
                                </div>
                                <span>{event.owner.full_name || event.owner.email}</span>
                              </div>
                              
                              {event.registration_ends_at && (
                                <div className="flex items-center">
                                  <CalendarDaysIcon className="h-4 w-4 mr-1 text-gray-400" />
                                  <span>
                                    Рег. до: {formatDateTime(event.registration_ends_at)}
                                  </span>
                                </div>
                              )}
                              
                              {event.results_published_at && (
                                <div className="flex items-center">
                                  <TrophyIcon className="h-4 w-4 mr-1 text-gray-400" />
                                  <span>
                                    Итоги: {formatDateTime(event.results_published_at)}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center">
                                <UserGroupIcon className="h-4 w-4 mr-1 text-gray-400" />
                                <span>{event.participants_count} участников</span>
                              </div>
                              
                              {/* Показываем статус сессий, если есть */}
                              {event.sessions_status && (
                                <div className="flex items-center">
                                  <VideoCameraIcon className="h-4 w-4 mr-1 text-gray-400" />
                                  <span>{event.sessions_status.display}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end ml-4">
                            <button
                              onClick={() => handleNavigateToEvent(event.id)}
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-2 rounded-lg hover:bg-blue-50"
                            >
                              Подробнее
                              <ArrowRightIcon className="h-4 w-4 ml-1" />
                            </button>
                            
                            {isOwner && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/events/${event.id}`);
                                }}
                                className="mt-2 text-xs text-purple-600 hover:text-purple-800"
                              >
                                Управление
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Сессии события */}
                        {sortedSessions.length > 0 && (
                          <div className="border-t border-gray-200 pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">
                                Сессии ({event.online_sessions_count + event.offline_sessions_count})
                              </h4>
                              <div className="flex items-center space-x-2">
                                {event.online_sessions_count > 0 && (
                                  <span className="inline-flex items-center text-xs text-purple-700">
                                    <ComputerDesktopIcon className="h-3 w-3 mr-1" />
                                    Онлайн: {event.online_sessions_count}
                                  </span>
                                )}
                                {event.offline_sessions_count > 0 && (
                                  <span className="inline-flex items-center text-xs text-yellow-700">
                                    <MapPinIcon className="h-3 w-3 mr-1" />
                                    Офлайн: {event.offline_sessions_count}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {sortedSessions.slice(0, 4).map((session) => {
                                const sessionStatus = getSessionStatus(session);
                                const SessionStatusIcon = sessionStatus.icon;
                                
                                return (
                                  <div 
                                    key={session.id}
                                    className={`border rounded-lg p-3 ${
                                      session.is_ongoing 
                                        ? 'border-green-200 bg-green-50' 
                                        : session.is_upcoming
                                        ? 'border-blue-200 bg-blue-50'
                                        : 'border-gray-200'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <div className="flex items-center mb-1">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sessionStatus.color}`}>
                                            <SessionStatusIcon className="h-3 w-3 mr-1" />
                                            {sessionStatus.text}
                                          </span>
                                          <span className="ml-2 text-xs px-2 py-0.5 rounded ${
                                            session.type === 'online' 
                                              ? 'bg-purple-100 text-purple-800' 
                                              : 'bg-yellow-100 text-yellow-800'
                                          }">
                                            {session.type === 'online' ? 'Онлайн' : 'Офлайн'}
                                          </span>
                                        </div>
                                        <h5 className="font-medium text-sm text-gray-900">
                                          {session.session_name}
                                        </h5>
                                      </div>
                                    </div>
                                    
                                    <div className="text-xs text-gray-600 space-y-1">
                                      <div className="flex items-center">
                                        <ClockIcon className="h-3 w-3 mr-1" />
                                        <span>Начало: {formatDateTime(session.start_time)}</span>
                                      </div>
                                      {session.end_time && (
                                        <div className="flex items-center">
                                          <ClockIcon className="h-3 w-3 mr-1" />
                                          <span>
                                            Конец: {formatDateTime(session.end_time)}
                                            {session.is_ongoing && (
                                              <span className="ml-2 text-orange-600 font-medium">
                                                ({calculateTimeLeft(session.end_time)})
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      )}
                                      {session.platform && (
                                        <div className="flex items-center">
                                          <ComputerDesktopIcon className="h-3 w-3 mr-1" />
                                          <span>{session.platform}</span>
                                        </div>
                                      )}
                                      {session.address && (
                                        <div className="flex items-center">
                                          <MapPinIcon className="h-3 w-3 mr-1" />
                                          <span className="truncate">{session.address}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {sortedSessions.length > 4 && (
                              <div className="mt-3 text-center">
                                <button
                                  onClick={() => handleNavigateToEvent(event.id)}
                                  className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                  Показать все {sortedSessions.length} сессий →
                                </button>
                              </div>
                            )}
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
                    {activeTab === 'upcoming' && 'Конференции, которые идут сейчас или скоро начнутся, появятся здесь'}
                    {activeTab === 'ongoing' && 'Конференции с активными сессиями или будущими сессиями появятся здесь'}
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
                    <Link
                      to="/events/create"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Создать конференцию
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Боковая панель */}
        <div className="space-y-6">
          {/* Информация о пользователе */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Мой профиль</h3>
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || user.email}
                    className="h-12 w-12 rounded-full"
                  />
                ) : (
                  <UserIcon className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {user?.full_name || user?.email}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Участник: {participatingEvents.length} конференций
                </div>
                <div className="text-sm text-gray-500">
                  Создано: {myEvents.length} конференций
                </div>
              </div>
            </div>
          </div>
          
          {/* Активные сессии */}
          {currentSessions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Активные сессии</h3>
                <span className="text-xs font-medium bg-orange-100 text-orange-800 px-2 py-1 rounded">
                  {currentSessions.length}
                </span>
              </div>
              <div className="space-y-4">
                {currentSessions.map(({ session, event }) => (
                  <div
                    key={session.id}
                    onClick={() => handleNavigateToEvent(event.id)}
                    className="border border-green-200 rounded-lg p-4 bg-green-50 hover:border-green-300 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center mb-1">
                          <PlayCircleIcon className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-sm font-medium text-green-800">Идет сейчас</span>
                        </div>
                        <h4 className="font-medium text-gray-900 truncate">{session.session_name}</h4>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        session.type === 'online' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.type === 'online' ? 'Онлайн' : 'Офлайн'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 truncate">{event.name}</p>
                    <div className="text-xs text-gray-700">
                      <div className="flex items-center">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        <span>До: {session.end_time ? formatDateTime(session.end_time) : 'Не указано'}</span>
                        {session.end_time && (
                          <span className="ml-2 text-orange-600 font-medium">
                            ({calculateTimeLeft(session.end_time)})
                          </span>
                        )}
                      </div>
                      {session.platform && (
                        <div className="flex items-center mt-1">
                          <ComputerDesktopIcon className="h-3 w-3 mr-1" />
                          <span className="truncate">{session.platform}</span>
                        </div>
                      )}
                      {session.address && (
                        <div className="flex items-center mt-1">
                          <MapPinIcon className="h-3 w-3 mr-1" />
                          <span className="truncate">{session.address}</span>
                        </div>
                      )}
                    </div>
                    <button className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium">
                      Присоединиться →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Конференции, которые идут */}
          {ongoingEvents.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Конференции в процессе</h3>
                <span className="text-xs font-medium bg-orange-100 text-orange-800 px-2 py-1 rounded">
                  {ongoingEvents.length}
                </span>
              </div>
              <div className="space-y-3">
                {ongoingEvents
                  .slice(0, 3)
                  .map(event => {
                    const eventCurrentStatus = getEventCurrentStatus(event);
                    const activeSessions = [
                      ...(event.upcoming_online_sessions || []),
                      ...(event.upcoming_offline_sessions || [])
                    ].filter(s => s.is_ongoing);
                    
                    const upcomingSessions = [
                      ...(event.upcoming_online_sessions || []),
                      ...(event.upcoming_offline_sessions || [])
                    ].filter(s => s.is_upcoming);
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => handleNavigateToEvent(event.id)}
                        className={`p-3 border rounded-lg cursor-pointer ${
                          eventCurrentStatus === 'ongoing_now'
                            ? 'border-green-200 bg-green-50 hover:border-green-300'
                            : 'border-orange-200 bg-orange-50 hover:border-orange-300'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                            eventCurrentStatus === 'ongoing_now'
                              ? 'bg-green-100'
                              : 'bg-orange-100'
                          }`}>
                            {eventCurrentStatus === 'ongoing_now' ? (
                              <PlayCircleIcon className="h-4 w-4 text-green-600" />
                            ) : (
                              <BellAlertIcon className="h-4 w-4 text-orange-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 truncate">{event.name}</div>
                            <div className="text-xs text-gray-500">
                              {activeSessions.length > 0 && `${activeSessions.length} активных сессий`}
                              {activeSessions.length === 0 && upcomingSessions.length > 0 && `${upcomingSessions.length} запланировано`}
                              {activeSessions.length === 0 && upcomingSessions.length === 0 && 'Идет конференция'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          
          {/* Быстрые действия */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-theme">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Быстрые действия</h3>
            <div className="space-y-3">
              <Link
                to="/events/create"
                className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all-sm"
              >
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-3">
                    <CalendarDaysIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="font-medium">Создать конференцию</span>
                </div>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              
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
              
              <Link
                to={`/user/sessions`}
                className="w-full flex items-center justify-between p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100"
              >
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center mr-3">
                    <VideoCameraIcon className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="font-medium">Мои сессии</span>
                </div>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;