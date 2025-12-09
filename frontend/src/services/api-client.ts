// src/services/api-client.ts
import { jwtAuthService } from './auth';

export const API_BASE_URL = 'http://localhost:8000';

class ApiClient {
  private async requestWithAuthRetry(url: string, options: RequestInit = {}): Promise<Response> {
    let accessToken = jwtAuthService.getAccessToken();
    
    if (!accessToken) {
      throw new Error('No authentication token');
    }

    // Первый запрос с текущим токеном
    let response = await fetch(API_BASE_URL + url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Если токен истек (401 ошибка), пробуем обновить
    if (response.status === 401) {
      try {
        // Обновляем access token
        accessToken = await jwtAuthService.refreshToken();
        
        // Повторяем запрос с новым токеном
        response = await fetch(API_BASE_URL + url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
      } catch (refreshError) {
        // Если refresh не удался - разлогиниваем
        jwtAuthService.logout();
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response;
  }

  // Базовые методы
  async get<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await this.requestWithAuthRetry(url, {
      ...options,
      method: 'GET',
    });
    return response.json();
  }

  async post<T = any>(url: string, data: any, options: RequestInit = {}): Promise<T> {
    const response = await this.requestWithAuthRetry(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async put<T = any>(url: string, data: any, options: RequestInit = {}): Promise<T> {
    const response = await this.requestWithAuthRetry(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async patch<T = any>(url: string, data: any, options: RequestInit = {}): Promise<T> {
    const response = await this.requestWithAuthRetry(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async delete<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await this.requestWithAuthRetry(url, {
      ...options,
      method: 'DELETE',
    });
    return response.json();
  }
}
 

export const apiClient = new ApiClient();