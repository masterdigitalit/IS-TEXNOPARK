// src/services/userService.ts
import { apiClient } from './api-client';
import { ApiError, handleApiError } from '@/utils/error-handler';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  groups: number[];
  user_permissions: number[];
}

export interface UserStats {
  events_count: number;
  participations_count: number;
  sessions_attended: number;
  materials_uploaded: number;
}

export interface UserFilters {
  search?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined_after?: string;
  date_joined_before?: string;
  ordering?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface UserFormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  groups: number[];
}
// В userService.ts добавьте:
export interface Group {
  id: number;
  name: string;
}

export async function getGroups(): Promise<Group[]> {
  try {
    const response = await apiClient.get('/api/v1/groups/');
    return response.data.results || response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}
class UserService {
  // Получить список пользователей
  async getUsers(filters?: UserFilters, page = 1, pageSize = 20): Promise<PaginatedResponse<User>> {
    try {
      const params: any = { page, page_size: pageSize };
      
      if (filters) {
        Object.assign(params, filters);
      }
      
      const response = await apiClient.get('/api/v1/users/', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Получить пользователя по ID
  async getUser(id: number): Promise<User> {
    try {
      const response = await apiClient.get(`/api/v1/users/${id}/`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Получить текущего пользователя
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get('/api/v1/users/me/');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Создать пользователя
  async createUser(userData: UserFormData): Promise<User> {
    try {
      const response = await apiClient.post('/api/v1/users/', userData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Обновить пользователя
  async updateUser(id: number, userData: Partial<UserFormData>): Promise<User> {
    try {
      const response = await apiClient.patch(`/api/v1/users/${id}/`, userData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Удалить пользователя
  async deleteUser(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/users/${id}/`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Активировать пользователя
  async activateUser(id: number): Promise<User> {
    return this.updateUser(id, { is_active: true });
  }

  // Деактивировать пользователя
  async deactivateUser(id: number): Promise<User> {
    return this.updateUser(id, { is_active: false });
  }

  // Сделать персоналом
  async makeStaff(id: number): Promise<User> {
    return this.updateUser(id, { is_staff: true });
  }

  // Убрать из персонала
  async removeStaff(id: number): Promise<User> {
    return this.updateUser(id, { is_staff: false });
  }

  // Получить статистику пользователя
  async getUserStats(id: number): Promise<UserStats> {
    try {
      // Получаем события пользователя
      const eventsResponse = await apiClient.get('/api/v1/events/', { 
        params: { owner: id, page_size: 1 } 
      });
      
      // Получаем участия пользователя
      const participationsResponse = await apiClient.get('/api/v1/event-participants/', { 
        params: { user: id, page_size: 1 } 
      });

      // Получаем посещения сессий
      const attendanceResponse = await apiClient.get('/api/v1/session-attendances/', { 
        params: { participant: id, page_size: 1 } 
      });

      // Получаем загруженные материалы
      const materialsResponse = await apiClient.get('/api/v1/session-materials/', { 
        params: { uploaded_by: id, page_size: 1 } 
      });

      return {
        events_count: eventsResponse.data.count || 0,
        participations_count: participationsResponse.data.count || 0,
        sessions_attended: attendanceResponse.data.count || 0,
        materials_uploaded: materialsResponse.data.count || 0,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Получить пользователей с дополнительной статистикой
  async getUsersWithStats(filters?: UserFilters, page = 1, pageSize = 20): Promise<{
    users: User[];
    stats: Record<number, UserStats>;
    pagination: Omit<PaginatedResponse<User>, 'results'>;
  }> {
    try {
      const usersResponse = await this.getUsers(filters, page, pageSize);
      
      // Получаем статистику для каждого пользователя
      const statsPromises = usersResponse.results.map(user => 
        this.getUserStats(user.id).catch(() => ({
          events_count: 0,
          participations_count: 0,
          sessions_attended: 0,
          materials_uploaded: 0,
        }))
      );
      
      const statsResults = await Promise.all(statsPromises);
      
      const statsMap: Record<number, UserStats> = {};
      usersResponse.results.forEach((user, index) => {
        statsMap[user.id] = statsResults[index];
      });

      return {
        users: usersResponse.results,
        stats: statsMap,
        pagination: {
          count: usersResponse.count,
          next: usersResponse.next,
          previous: usersResponse.previous,
        }
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const userService = new UserService();