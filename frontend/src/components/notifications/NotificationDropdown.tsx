// src/components/notifications/NotificationDropdown.tsx - упрощенная версия
import React, { useState, useEffect } from 'react';
import { 
  CheckIcon, 
  TrashIcon,
  EnvelopeIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { notificationService, type Notification } from '../../services/notification-service';

interface NotificationDropdownProps {
  onClose?: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Загружаем уведомления и счетчик
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Параллельно загружаем уведомления и счетчик
      const [notificationsData, countData] = await Promise.all([
        notificationService.getAll(),
        notificationService.getUnreadCount()
      ]);
      
      setNotifications(notificationsData);
      setUnreadCount(countData.count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      
      // Обновляем локальное состояние
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // Обновляем счетчик
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      // Перезагружаем данные
      await loadData();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteAllRead = async () => {
    try {
      await notificationService.deleteAllRead();
      // Перезагружаем данные
      await loadData();
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await notificationService.delete(id);
      
      // Удаляем из локального состояния
      const deletedNotification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Обновляем счетчик если удалили непрочитанное
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'только что';
      if (diffInMinutes < 60) return `${diffInMinutes} мин назад`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} ч назад`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays} д назад`;
      
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg py-2 border border-gray-200 z-50">
      {/* Заголовок */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900">Уведомления</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {unreadCount} новых
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
                title="Прочитать все"
              >
                <CheckCircleIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              title="Закрыть"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Список уведомлений */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Загрузка...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <EnvelopeIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Нет уведомлений</p>
            <p className="text-sm text-gray-400 mt-1">Здесь будут появляться новые уведомления</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Статус прочтения */}
                  <div className="flex-shrink-0 pt-1">
                    {!notification.is_read ? (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    ) : (
                      <CheckIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  
                  {/* Содержимое уведомления */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </h4>
                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="text-gray-400 hover:text-red-600 flex-shrink-0"
                        title="Удалить"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <p className="mt-1 text-sm text-gray-600">
                      {notification.text}
                    </p>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatTime(notification.created_at)}
                      </span>
                      
                      {!notification.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Прочитано
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Футер */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {notifications.length} увед.
            </span>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadData}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Обновить
              </button>
              <button
                onClick={handleDeleteAllRead}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Очистить прочитанные
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;