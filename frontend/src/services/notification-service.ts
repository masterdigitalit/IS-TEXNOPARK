// src/services/notification-service.ts - исправленная версия
import { apiClient } from './api-client';

export interface Notification {
  id: number;
  title: string;
  text: string;
  is_read: boolean;
  created_at: string;
  created_at_formatted: string;
  read_at: string | null;
  read_at_formatted: string | null;
}

// Интерфейс для пагинированного ответа Django REST Framework
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkAllResponse {
  marked_count: number;
}

export interface DeleteAllResponse {
  deleted_count: number;
}

class NotificationService {
  // Получить все уведомления текущего пользователя
  async getAll(): Promise<Notification[]> {
    try {
      const response = await apiClient.get<PaginatedResponse<Notification>>('/api/v1/user/notifications/');
      
      // Проверяем наличие results
      if (response && Array.isArray(response.results)) {
        return response.results;
      }
      
      console.warn('Unexpected notifications response format:', response);
      return [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return []; // Возвращаем пустой массив вместо ошибки
    }
  }

  // Получить количество непрочитанных уведомлений
  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      return await apiClient.get<UnreadCountResponse>('/api/v1/user/notifications/unread_count/');
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return { count: 0 }; // Возвращаем 0 вместо ошибки
    }
  }

  // Пометить уведомление как прочитанное
  async markAsRead(notificationId: number): Promise<any> {
    try {
      return await apiClient.post(`/api/v1/user/notifications/${notificationId}/mark_as_read/`, {});
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Пометить все уведомления как прочитанные
  async markAllAsRead(): Promise<MarkAllResponse> {
    try {
      return await apiClient.post<MarkAllResponse>('/api/v1/user/notifications/mark_all_as_read/', {});
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  // Удалить все прочитанные уведомления
  async deleteAllRead(): Promise<DeleteAllResponse> {
    try {
      return await apiClient.delete<DeleteAllResponse>('/api/v1/user/notifications/delete_all_read/');
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      throw error;
    }
  }

  // Удалить конкретное уведомление
  async delete(notificationId: number): Promise<void> {
    try {
      return await apiClient.delete(`/api/v1/user/notifications/${notificationId}/`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();