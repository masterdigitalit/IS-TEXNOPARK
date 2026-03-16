// src/components/admin/events/EventCreatePage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  VideoCameraIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  LinkIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

// Типы данных
interface OnlineSession {
  session_name: string;
  start_time: string;
  end_time: string;
  platform: string;
  link: string;
  access_code: string;
  max_participants: string;
  session_notes: string;
}

interface OfflineSession {
  session_name: string;
  start_time: string;
  end_time: string;
  address: string;
  room: string;
  session_notes: string;
  max_participants: string;
}

interface EventFormData {
  name: string;
  description: string;
  status: 'draft' | 'published';
  is_active: boolean;
  is_private: boolean;
  closes_at: string;
  registration_ends_at: string;
  results_published_at: string;
  image_url: string;
}

const EventCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Состояния для основного события
  const [eventForm, setEventForm] = useState<EventFormData>({
    name: '',
    description: '',
    status: 'draft',
    is_active: true,
    is_private: false,
    closes_at: '',
    registration_ends_at: '',
    results_published_at: '',
    image_url: '',
  });

  // Состояния для сессий
  const [onlineSessions, setOnlineSessions] = useState<OnlineSession[]>([]);
  const [offlineSessions, setOfflineSessions] = useState<OfflineSession[]>([]);

  // Состояния UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'online' | 'offline'>('main');

  // Обработчики для основного события
  const handleEventChange = (field: keyof EventFormData, value: any) => {
    setEventForm(prev => ({ ...prev, [field]: value }));
  };

  // Обработчики для онлайн сессий
  const handleAddOnlineSession = () => {
    setOnlineSessions(prev => [
      ...prev,
      {
        session_name: '',
        start_time: '',
        end_time: '',
        platform: 'zoom',
        link: '',
        access_code: '',
        max_participants: '',
        session_notes: '',
      },
    ]);
  };

  const handleRemoveOnlineSession = (index: number) => {
    setOnlineSessions(prev => prev.filter((_, i) => i !== index));
  };

  const handleOnlineSessionChange = (
    index: number,
    field: keyof OnlineSession,
    value: string
  ) => {
    setOnlineSessions(prev =>
      prev.map((session, i) => (i === index ? { ...session, [field]: value } : session))
    );
  };

  // Обработчики для офлайн сессий
  const handleAddOfflineSession = () => {
    setOfflineSessions(prev => [
      ...prev,
      {
        session_name: '',
        start_time: '',
        end_time: '',
        address: '',
        room: '',
        session_notes: '',
        max_participants: '',
      },
    ]);
  };

  const handleRemoveOfflineSession = (index: number) => {
    setOfflineSessions(prev => prev.filter((_, i) => i !== index));
  };

  const handleOfflineSessionChange = (
    index: number,
    field: keyof OfflineSession,
    value: string
  ) => {
    setOfflineSessions(prev =>
      prev.map((session, i) => (i === index ? { ...session, [field]: value } : session))
    );
  };

  // Валидация
  const validateForm = (): boolean => {
    if (!eventForm.name.trim()) {
      setError('Введите название события');
      return false;
    }

    if (!eventForm.closes_at) {
      setError('Укажите дату окончания события');
      return false;
    }

    const closesAt = new Date(eventForm.closes_at);
    const now = new Date();
    if (closesAt <= now) {
      setError('Дата окончания должна быть в будущем');
      return false;
    }

    // Валидация сессий
    const hasSessions = onlineSessions.length > 0 || offlineSessions.length > 0;
    if (!hasSessions) {
      setError('Добавьте хотя бы одну сессию (онлайн или офлайн)');
      return false;
    }

    // Валидация онлайн сессий
    for (let i = 0; i < onlineSessions.length; i++) {
      const session = onlineSessions[i];
      if (!session.session_name.trim()) {
        setError(`Укажите название для онлайн-сессии #${i + 1}`);
        return false;
      }
      if (!session.start_time) {
        setError(`Укажите время начала для онлайн-сессии #${i + 1}`);
        return false;
      }
      if (!session.end_time) {
        setError(`Укажите время окончания для онлайн-сессии #${i + 1}`);
        return false;
      }
      const start = new Date(session.start_time);
      const end = new Date(session.end_time);
      if (end <= start) {
        setError(`Время окончания должно быть позже времени начала для онлайн-сессии #${i + 1}`);
        return false;
      }
    }

    // Валидация офлайн сессий
    for (let i = 0; i < offlineSessions.length; i++) {
      const session = offlineSessions[i];
      if (!session.session_name.trim()) {
        setError(`Укажите название для офлайн-сессии #${i + 1}`);
        return false;
      }
      if (!session.start_time) {
        setError(`Укажите время начала для офлайн-сессии #${i + 1}`);
        return false;
      }
      if (!session.end_time) {
        setError(`Укажите время окончания для офлайн-сессии #${i + 1}`);
        return false;
      }
      const start = new Date(session.start_time);
      const end = new Date(session.end_time);
      if (end <= start) {
        setError(`Время окончания должно быть позже времени начала для офлайн-сессии #${i + 1}`);
        return false;
      }
      if (!session.address.trim()) {
        setError(`Укажите адрес для офлайн-сессии #${i + 1}`);
        return false;
      }
    }

    return true;
  };

  // Отправка формы
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // 1. Создаем событие
      const eventData = {
        name: eventForm.name,
        description: eventForm.description || '',
        status: eventForm.status,
        is_active: eventForm.is_active,
        is_private: eventForm.is_private,
        closes_at: eventForm.closes_at,
        registration_ends_at: eventForm.registration_ends_at || null,
        results_published_at: eventForm.results_published_at || null,
        image_url: eventForm.image_url || null,
      };

      const createdEvent = await apiClient.post('/api/v1/events/', eventData);
      const eventId = createdEvent.id;

      console.log('Событие создано:', eventId);

      // 2. Создаем онлайн сессии
      for (const session of onlineSessions) {
        await apiClient.post('/api/v1/events/online-sessions/', {
          event_id: eventId,
          session_name: session.session_name,
          start_time: session.start_time,
          end_time: session.end_time,
          platform: session.platform,
          link: session.link || null,
          access_code: session.access_code || null,
          max_participants: session.max_participants ? parseInt(session.max_participants) : null,
          session_notes: session.session_notes || '',
          is_active: true,
          status: 'scheduled',
        });
      }

      // 3. Создаем офлайн сессии
      for (const session of offlineSessions) {
        await apiClient.post('/api/v1/events/offline-sessions/', {
          event_id: eventId,
          session_name: session.session_name,
          start_time: session.start_time,
          end_time: session.end_time,
          address: session.address,
          room: session.room || null,
          max_participants: session.max_participants ? parseInt(session.max_participants) : null,
          session_notes: session.session_notes || '',
          is_active: true,
          status: 'scheduled',
        });
      }

      setSuccess(true);

      // Перенаправление через 2 секунды
      setTimeout(() => {
        navigate(`/admin/events`);
      }, 2000);

    } catch (err: any) {
      console.error('Ошибка создания события:', err);
      setError(err.message || 'Не удалось создать событие');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/events');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-6 transition-theme">
      {/* Хедер */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mr-4"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Назад
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Создание события</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Заполните информацию о новом событии
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Сообщения */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
            <p className="text-red-800 dark:text-red-300 font-medium">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
            <p className="text-green-800 dark:text-green-300 font-medium">
              Событие успешно создано! Перенаправление...
            </p>
          </div>
        </div>
      )}

      {/* Табы навигации */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-slate-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('main')}
              className={`pb-4 px-1 font-medium text-sm transition-theme ${
                activeTab === 'main'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Основная информация
              </div>
            </button>
            <button
              onClick={() => setActiveTab('online')}
              className={`pb-4 px-1 font-medium text-sm transition-theme ${
                activeTab === 'online'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <VideoCameraIcon className="h-4 w-4 mr-2" />
                Онлайн сессии
                {onlineSessions.length > 0 && (
                  <span className="ml-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs">
                    {onlineSessions.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('offline')}
              className={`pb-4 px-1 font-medium text-sm transition-theme ${
                activeTab === 'offline'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <MapPinIcon className="h-4 w-4 mr-2" />
                Офлайн сессии
                {offlineSessions.length > 0 && (
                  <span className="ml-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs">
                    {offlineSessions.length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Контент */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-theme">
        {/* Основная информация */}
        {activeTab === 'main' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Название события *
              </label>
              <input
                type="text"
                value={eventForm.name}
                onChange={(e) => handleEventChange('name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Например: Научная конференция 2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Описание
              </label>
              <textarea
                value={eventForm.description}
                onChange={(e) => handleEventChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Опишите событие, его цели и задачи..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата окончания события *
                </label>
                <input
                  type="datetime-local"
                  value={eventForm.closes_at}
                  onChange={(e) => handleEventChange('closes_at', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата окончания регистрации
                </label>
                <input
                  type="datetime-local"
                  value={eventForm.registration_ends_at}
                  onChange={(e) => handleEventChange('registration_ends_at', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата публикации результатов
                </label>
                <input
                  type="datetime-local"
                  value={eventForm.results_published_at}
                  onChange={(e) => handleEventChange('results_published_at', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL изображения
                </label>
                <input
                  type="url"
                  value={eventForm.image_url}
                  onChange={(e) => handleEventChange('image_url', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eventForm.is_private}
                  onChange={(e) => handleEventChange('is_private', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Приватное мероприятие
                </span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eventForm.is_active}
                  onChange={(e) => handleEventChange('is_active', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Активно
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Статус
              </label>
              <select
                value={eventForm.status}
                onChange={(e) => handleEventChange('status', e.target.value as 'draft' | 'published')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Черновик</option>
                <option value="published">Опубликовано</option>
              </select>
            </div>
          </div>
        )}

        {/* Онлайн сессии */}
        {activeTab === 'online' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Онлайн сессии</h3>
              <button
                onClick={handleAddOnlineSession}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Добавить сессию
              </button>
            </div>

            {onlineSessions.length === 0 ? (
              <div className="text-center py-12">
                <VideoCameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Нет онлайн сессий</p>
                <button
                  onClick={handleAddOnlineSession}
                  className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  Добавить первую сессию
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {onlineSessions.map((session, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-slate-600 rounded-lg p-5 bg-gray-50 dark:bg-slate-700/50"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Онлайн сессия #{index + 1}
                      </h4>
                      <button
                        onClick={() => handleRemoveOnlineSession(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Название сессии *
                        </label>
                        <input
                          type="text"
                          value={session.session_name}
                          onChange={(e) => handleOnlineSessionChange(index, 'session_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Секция 1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Платформа
                        </label>
                        <select
                          value={session.platform}
                          onChange={(e) => handleOnlineSessionChange(index, 'platform', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Время начала *
                        </label>
                        <input
                          type="datetime-local"
                          value={session.start_time}
                          onChange={(e) => handleOnlineSessionChange(index, 'start_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Время окончания *
                        </label>
                        <input
                          type="datetime-local"
                          value={session.end_time}
                          onChange={(e) => handleOnlineSessionChange(index, 'end_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Ссылка для подключения
                        </label>
                        <input
                          type="url"
                          value={session.link}
                          onChange={(e) => handleOnlineSessionChange(index, 'link', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="https://zoom.us/j/..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Код доступа
                        </label>
                        <input
                          type="text"
                          value={session.access_code}
                          onChange={(e) => handleOnlineSessionChange(index, 'access_code', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="123456"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Макс. участников
                        </label>
                        <input
                          type="number"
                          value={session.max_participants}
                          onChange={(e) => handleOnlineSessionChange(index, 'max_participants', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="100"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Заметки
                      </label>
                      <textarea
                        value={session.session_notes}
                        onChange={(e) => handleOnlineSessionChange(index, 'session_notes', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Дополнительная информация..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Офлайн сессии */}
        {activeTab === 'offline' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Офлайн сессии</h3>
              <button
                onClick={handleAddOfflineSession}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Добавить сессию
              </button>
            </div>

            {offlineSessions.length === 0 ? (
              <div className="text-center py-12">
                <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Нет офлайн сессий</p>
                <button
                  onClick={handleAddOfflineSession}
                  className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  Добавить первую сессию
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {offlineSessions.map((session, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-slate-600 rounded-lg p-5 bg-gray-50 dark:bg-slate-700/50"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Офлайн сессия #{index + 1}
                      </h4>
                      <button
                        onClick={() => handleRemoveOfflineSession(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Название сессии *
                        </label>
                        <input
                          type="text"
                          value={session.session_name}
                          onChange={(e) => handleOfflineSessionChange(index, 'session_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Секция 1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Адрес *
                        </label>
                        <input
                          type="text"
                          value={session.address}
                          onChange={(e) => handleOfflineSessionChange(index, 'address', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="ул. Примерная, д. 1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Время начала *
                        </label>
                        <input
                          type="datetime-local"
                          value={session.start_time}
                          onChange={(e) => handleOfflineSessionChange(index, 'start_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Время окончания *
                        </label>
                        <input
                          type="datetime-local"
                          value={session.end_time}
                          onChange={(e) => handleOfflineSessionChange(index, 'end_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Аудитория/комната
                        </label>
                        <input
                          type="text"
                          value={session.room}
                          onChange={(e) => handleOfflineSessionChange(index, 'room', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Ауд. 301"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Макс. участников
                        </label>
                        <input
                          type="number"
                          value={session.max_participants}
                          onChange={(e) => handleOfflineSessionChange(index, 'max_participants', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="50"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Заметки
                      </label>
                      <textarea
                        value={session.session_notes}
                        onChange={(e) => handleOfflineSessionChange(index, 'session_notes', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Дополнительная информация..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Кнопки действий */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
          <div className="flex justify-end space-x-4">
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-theme"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-theme"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Создание...
                </span>
              ) : (
                'Создать событие'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCreatePage;
