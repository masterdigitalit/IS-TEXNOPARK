// src/components/admin/events/EventManagePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeftIcon,
  UsersIcon,
  UserPlusIcon,
  TrashIcon,
  VideoCameraIcon,
  MapPinIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ClockIcon,
  LinkIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { handleApiError } from '@/utils/error-handler';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface User {
  id: number;
  email: string;
  full_name: string | null;
  username: string;
}

interface Participant {
  id: number;
  user: User;
  registered_at: string;
  role: 'participant' | 'owner' | 'referee';
  is_confirmed: boolean;
}

interface OnlineSession {
  id: number;
  session_name: string;
  start_time: string;
  end_time: string | null;
  session_notes: string | null;
  link: string | null;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  platform: string;
  access_code: string | null;
  max_participants: number | null;
  is_active: boolean;
}

interface OfflineSession {
  id: number;
  session_name: string;
  start_time: string;
  end_time: string | null;
  session_notes: string | null;
  address: string | null;
  room: string | null;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  max_participants: number | null;
  is_active: boolean;
}

interface Event {
  id: number;
  owner: User;
  name: string;
  description: string | null;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  is_active: boolean;
  is_open: boolean;
  participants_count: number;
  online_sessions_count: number;
  offline_sessions_count: number;
}

interface OnlineSessionForm {
  session_name: string;
  start_time: string;
  end_time: string;
  platform: string;
  link: string;
  access_code: string;
  session_notes: string;
  max_participants: string;
}

interface OfflineSessionForm {
  session_name: string;
  start_time: string;
  end_time: string;
  address: string;
  room: string;
  session_notes: string;
  max_participants: string;
}

const EventManagePage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [onlineSessions, setOnlineSessions] = useState<OnlineSession[]>([]);
  const [offlineSessions, setOfflineSessions] = useState<OfflineSession[]>([]);
  
  // Поиск пользователей
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  // Модальные окна
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [showAddOnlineSession, setShowAddOnlineSession] = useState(false);
  const [showAddOfflineSession, setShowAddOfflineSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Формы
  const [onlineSessionForm, setOnlineSessionForm] = useState<OnlineSessionForm>({
    session_name: '',
    start_time: '',
    end_time: '',
    platform: 'zoom',
    link: '',
    access_code: '',
    session_notes: '',
    max_participants: '',
  });

  const [offlineSessionForm, setOfflineSessionForm] = useState<OfflineSessionForm>({
    session_name: '',
    start_time: '',
    end_time: '',
    address: '',
    room: '',
    session_notes: '',
    max_participants: '',
  });

  const [activeTab, setActiveTab] = useState<'participants' | 'online' | 'offline'>('participants');

  const loadData = async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);

    try {
      const [eventData, participantsData, onlineData, offlineData] = await Promise.all([
        apiClient.get<Event>(`/api/v1/events/${eventId}/`),
        apiClient.get<Participant[]>(`/api/v1/events/${eventId}/participants/`),
        apiClient.get<OnlineSession[]>(`/api/v1/online-sessions/`, { event: eventId }),
        apiClient.get<OfflineSession[]>(`/api/v1/offline-sessions/`, { event: eventId }),
      ]);

      setEvent(eventData);
      // API может возвращать пагинированный ответ или просто массив
      setParticipants(participantsData.results || participantsData);
      setOnlineSessions(onlineData.results || onlineData);
      setOfflineSessions(offlineData.results || offlineData);
    } catch (err: any) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  // Поиск пользователей
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setSearching(true);
        try {
          const response = await apiClient.get<User[]>('/api/v1/users/', {
            params: { search: searchQuery, page_size: 10 }
          });
          setSearchResults(response.results || response);
        } catch (err) {
          console.error('Ошибка поиска:', err);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Добавление участника
  const handleAddParticipant = async (userId: number) => {
    try {
      // Используем прямой URL для создания участника
      await apiClient.post(`/api/v1/events/${eventId}/participants/`, {
        user_id: userId,
        event_id: parseInt(eventId!),
        role: 'participant',
      });
      await loadData();
      setShowAddParticipant(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      console.error('Ошибка добавления участника:', err);
      console.error('Error data:', err.response?.data);
      const apiError = handleApiError(err);
      setError(apiError.message || 'Не удалось добавить участника');
    }
  };

  // Отмена приглашения (для организатора)
  const handleCancelInvitation = async (participantId: number) => {
    if (!confirm('Отменить приглашение этого участника?')) return;

    try {
      await apiClient.delete(`/api/v1/events/${eventId}/participants/${participantId}/`);
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    } catch (err: any) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    }
  };

  // Удаление участника
  const handleRemoveParticipant = async (participantId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого участника?')) return;

    try {
      await apiClient.delete(`/api/v1/events/${eventId}/participants/${participantId}/`);
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    } catch (err: any) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    }
  };

  // Добавление онлайн-сессии
  const handleAddOnlineSession = async () => {
    try {
      await apiClient.post('/api/v1/online-sessions/', {
        event_id: parseInt(eventId!),
        session_name: onlineSessionForm.session_name,
        start_time: onlineSessionForm.start_time,
        end_time: onlineSessionForm.end_time || null,
        platform: onlineSessionForm.platform,
        link: onlineSessionForm.link || null,
        access_code: onlineSessionForm.access_code || null,
        session_notes: onlineSessionForm.session_notes || null,
        max_participants: onlineSessionForm.max_participants ? parseInt(onlineSessionForm.max_participants) : null,
      });
      await loadData();
      setShowAddOnlineSession(false);
      setOnlineSessionForm({
        session_name: '',
        start_time: '',
        end_time: '',
        platform: 'zoom',
        link: '',
        access_code: '',
        session_notes: '',
        max_participants: '',
      });
    } catch (err: any) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    }
  };

  // Добавление оффлайн-сессии
  const handleAddOfflineSession = async () => {
    try {
      await apiClient.post('/api/v1/offline-sessions/', {
        event_id: parseInt(eventId!),
        session_name: offlineSessionForm.session_name,
        start_time: offlineSessionForm.start_time,
        end_time: offlineSessionForm.end_time || null,
        address: offlineSessionForm.address || null,
        room: offlineSessionForm.room || null,
        session_notes: offlineSessionForm.session_notes || null,
        max_participants: offlineSessionForm.max_participants ? parseInt(offlineSessionForm.max_participants) : null,
      });
      await loadData();
      setShowAddOfflineSession(false);
      setOfflineSessionForm({
        session_name: '',
        start_time: '',
        end_time: '',
        address: '',
        room: '',
        session_notes: '',
        max_participants: '',
      });
    } catch (err: any) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    }
  };

  // Удаление сессии
  const handleDeleteSession = async (sessionId: number, type: 'online' | 'offline') => {
    if (!confirm('Вы уверены, что хотите удалить эту сессию?')) return;

    try {
      const endpoint = type === 'online' 
        ? `/api/v1/online-sessions/${sessionId}/`
        : `/api/v1/offline-sessions/${sessionId}/`;
      
      await apiClient.delete(endpoint);
      if (type === 'online') {
        setOnlineSessions(prev => prev.filter(s => s.id !== sessionId));
      } else {
        setOfflineSessions(prev => prev.filter(s => s.id !== sessionId));
      }
    } catch (err: any) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewStatistics = () => {
    navigate(`/events/${eventId}/statistics`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-4">
            <p className="text-red-600 font-medium">{error || 'Событие не найдено'}</p>
          </div>
          <Button onClick={() => navigate('/admin/events')}>Назад</Button>
        </div>
      </div>
    );
  }

  const isOwner = event.owner.id === user?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin/events')}>
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Управление событием</h1>
                <p className="text-sm text-gray-500">{event.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleViewStatistics} variant="outline">
                <ChartBarIcon className="h-4 w-4 mr-2" />
                Статистика
              </Button>
              <Button onClick={() => navigate(`/user/events/${eventId}`)}>
                Просмотр события
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('participants')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
                activeTab === 'participants'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <UsersIcon className="h-5 w-5" />
              Участники ({participants.length})
            </button>
            <button
              onClick={() => setActiveTab('online')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
                activeTab === 'online'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <VideoCameraIcon className="h-5 w-5" />
              Онлайн-сессии ({onlineSessions.length})
            </button>
            <button
              onClick={() => setActiveTab('offline')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
                activeTab === 'offline'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <MapPinIcon className="h-5 w-5" />
              Оффлайн-сессии ({offlineSessions.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'participants' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Участники события</h2>
              <Button onClick={() => setShowAddParticipant(true)}>
                <UserPlusIcon className="h-4 w-4 mr-2" />
                Добавить участника
              </Button>
            </div>

            {participants.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Пока нет участников</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Участник</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата регистрации</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {participants.map((participant) => (
                      <tr key={participant.id}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-semibold text-blue-600">
                                {(participant.user.full_name || participant.user.username || participant.user.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {participant.user.full_name || participant.user.username || participant.user.email}
                              </p>
                              <p className="text-sm text-gray-500">{participant.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            participant.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                            participant.role === 'referee' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          )}>
                            {participant.role === 'owner' ? 'Владелец' :
                             participant.role === 'referee' ? 'Судья' : 'Участник'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {participant.is_confirmed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircleIcon className="h-3 w-3" />
                              Подтверждено
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <ClockIcon className="h-3 w-3" />
                              Ожидает
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(participant.registered_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {participant.role !== 'owner' && (
                            <div className="flex items-center justify-end gap-2">
                              {!participant.is_confirmed && (
                                <button
                                  onClick={() => handleCancelInvitation(participant.id)}
                                  className="text-yellow-600 hover:text-yellow-900 p-2"
                                  title="Отменить приглашение"
                                >
                                  <XMarkIcon className="h-5 w-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveParticipant(participant.id)}
                                className="text-red-600 hover:text-red-900 p-2"
                                title="Удалить"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'online' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Онлайн-сессии</h2>
              <Button onClick={() => setShowAddOnlineSession(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Добавить сессию
              </Button>
            </div>

            {onlineSessions.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <VideoCameraIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Пока нет онлайн-сессий</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {onlineSessions.map((session) => (
                  <div key={session.id} className="bg-white rounded-xl border p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <VideoCameraIcon className="h-6 w-6 text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-900">{session.session_name}</h3>
                          <span className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            session.status === 'ongoing' ? 'bg-green-100 text-green-800' :
                            session.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          )}>
                            {session.status === 'scheduled' ? 'Запланирована' :
                             session.status === 'ongoing' ? 'Идет' :
                             session.status === 'completed' ? 'Завершена' : 'Отменена'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span>Начало: {formatDate(session.start_time)}</span>
                          </div>
                          {session.end_time && (
                            <div className="flex items-center gap-2">
                              <ClockIcon className="h-4 w-4" />
                              <span>Окончание: {formatDate(session.end_time)}</span>
                            </div>
                          )}
                          {session.link && (
                            <div className="flex items-center gap-2">
                              <LinkIcon className="h-4 w-4" />
                              <a href={session.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                Присоединиться
                              </a>
                            </div>
                          )}
                          {session.access_code && (
                            <div className="flex items-center gap-2">
                              <DocumentTextIcon className="h-4 w-4" />
                              <span>Код доступа: {session.access_code}</span>
                            </div>
                          )}
                          {session.session_notes && (
                            <div className="flex items-start gap-2 mt-2">
                              <DocumentTextIcon className="h-4 w-4 mt-0.5" />
                              <p className="text-gray-600">{session.session_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSession(session.id, 'online')}
                        className="text-red-600 hover:text-red-900 p-2"
                        title="Удалить"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'offline' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Оффлайн-сессии</h2>
              <Button onClick={() => setShowAddOfflineSession(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Добавить сессию
              </Button>
            </div>

            {offlineSessions.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <MapPinIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Пока нет оффлайн-сессий</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {offlineSessions.map((session) => (
                  <div key={session.id} className="bg-white rounded-xl border p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <MapPinIcon className="h-6 w-6 text-green-600" />
                          <h3 className="text-lg font-semibold text-gray-900">{session.session_name}</h3>
                          <span className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            session.status === 'ongoing' ? 'bg-green-100 text-green-800' :
                            session.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          )}>
                            {session.status === 'scheduled' ? 'Запланирована' :
                             session.status === 'ongoing' ? 'Идет' :
                             session.status === 'completed' ? 'Завершена' : 'Отменена'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span>Начало: {formatDate(session.start_time)}</span>
                          </div>
                          {session.end_time && (
                            <div className="flex items-center gap-2">
                              <ClockIcon className="h-4 w-4" />
                              <span>Окончание: {formatDate(session.end_time)}</span>
                            </div>
                          )}
                          {session.address && (
                            <div className="flex items-center gap-2">
                              <BuildingOfficeIcon className="h-4 w-4" />
                              <span>{session.address}</span>
                            </div>
                          )}
                          {session.room && (
                            <div className="flex items-center gap-2">
                              <BuildingOfficeIcon className="h-4 w-4" />
                              <span>Кабинет: {session.room}</span>
                            </div>
                          )}
                          {session.session_notes && (
                            <div className="flex items-start gap-2 mt-2">
                              <DocumentTextIcon className="h-4 w-4 mt-0.5" />
                              <p className="text-gray-600">{session.session_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSession(session.id, 'offline')}
                        className="text-red-600 hover:text-red-900 p-2"
                        title="Удалить"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Add Participant */}
      {showAddParticipant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Добавить участника</h3>
              <button onClick={() => setShowAddParticipant(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по имени или email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              {searching && (
                <div className="mt-4 text-center text-gray-500">Поиск...</div>
              )}
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((userResult) => {
                    const isAlreadyParticipant = participants.some(p => p.user.id === userResult.id);
                    return (
                      <div
                        key={userResult.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border',
                          isAlreadyParticipant ? 'bg-gray-50 opacity-50' : 'bg-white hover:bg-gray-50'
                        )}
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {userResult.full_name || userResult.username}
                          </p>
                          <p className="text-sm text-gray-500">{userResult.email}</p>
                        </div>
                        {isAlreadyParticipant ? (
                          <span className="text-sm text-gray-500">Уже участвует</span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAddParticipant(userResult.id)}
                          >
                            Добавить
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Online Session */}
      {showAddOnlineSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Добавить онлайн-сессию</h3>
              <button onClick={() => setShowAddOnlineSession(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название сессии</label>
                <input
                  type="text"
                  value={onlineSessionForm.session_name}
                  onChange={(e) => setOnlineSessionForm({...onlineSessionForm, session_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Например: Секция математики"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Начало</label>
                  <input
                    type="datetime-local"
                    value={onlineSessionForm.start_time}
                    onChange={(e) => setOnlineSessionForm({...onlineSessionForm, start_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Окончание</label>
                  <input
                    type="datetime-local"
                    value={onlineSessionForm.end_time}
                    onChange={(e) => setOnlineSessionForm({...onlineSessionForm, end_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Платформа</label>
                <select
                  value={onlineSessionForm.platform}
                  onChange={(e) => setOnlineSessionForm({...onlineSessionForm, platform: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="zoom">Zoom</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="meet">Google Meet</option>
                  <option value="webex">Webex</option>
                  <option value="jitsi">Jitsi</option>
                  <option value="other">Другая</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ссылка для подключения</label>
                <input
                  type="url"
                  value={onlineSessionForm.link}
                  onChange={(e) => setOnlineSessionForm({...onlineSessionForm, link: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Код доступа</label>
                <input
                  type="text"
                  value={onlineSessionForm.access_code}
                  onChange={(e) => setOnlineSessionForm({...onlineSessionForm, access_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Например: 123456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Максимум участников</label>
                <input
                  type="number"
                  value={onlineSessionForm.max_participants}
                  onChange={(e) => setOnlineSessionForm({...onlineSessionForm, max_participants: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Например: 50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Заметки</label>
                <textarea
                  value={onlineSessionForm.session_notes}
                  onChange={(e) => setOnlineSessionForm({...onlineSessionForm, session_notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Дополнительная информация..."
                />
              </div>
              <Button onClick={handleAddOnlineSession} className="w-full">
                Создать сессию
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Offline Session */}
      {showAddOfflineSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Добавить оффлайн-сессию</h3>
              <button onClick={() => setShowAddOfflineSession(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название сессии</label>
                <input
                  type="text"
                  value={offlineSessionForm.session_name}
                  onChange={(e) => setOfflineSessionForm({...offlineSessionForm, session_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Например: Секция физики"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Начало</label>
                  <input
                    type="datetime-local"
                    value={offlineSessionForm.start_time}
                    onChange={(e) => setOfflineSessionForm({...offlineSessionForm, start_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Окончание</label>
                  <input
                    type="datetime-local"
                    value={offlineSessionForm.end_time}
                    onChange={(e) => setOfflineSessionForm({...offlineSessionForm, end_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                <input
                  type="text"
                  value={offlineSessionForm.address}
                  onChange={(e) => setOfflineSessionForm({...offlineSessionForm, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Например: ул. Ленина, 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Кабинет/аудитория</label>
                <input
                  type="text"
                  value={offlineSessionForm.room}
                  onChange={(e) => setOfflineSessionForm({...offlineSessionForm, room: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Например: 301"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Максимум участников</label>
                <input
                  type="number"
                  value={offlineSessionForm.max_participants}
                  onChange={(e) => setOfflineSessionForm({...offlineSessionForm, max_participants: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Например: 30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Заметки</label>
                <textarea
                  value={offlineSessionForm.session_notes}
                  onChange={(e) => setOfflineSessionForm({...offlineSessionForm, session_notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Дополнительная информация..."
                />
              </div>
              <Button onClick={handleAddOfflineSession} className="w-full">
                Создать сессию
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManagePage;
