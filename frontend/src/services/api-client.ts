// src/services/api-client.ts
import { jwtAuthService } from './auth';

export const API_BASE_URL = 'http://localhost:8000';

class ApiClient {
  // Метод для построения query string из параметров
  private buildQueryString(params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return '';
    }
    
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  private async requestWithAuthRetry(url: string, options: RequestInit = {}): Promise<Response> {
    let accessToken = jwtAuthService.getAccessToken();
    
    if (!accessToken) {
      throw new Error('No authentication token');
    }

    // Добавляем базовый URL
    const fullUrl = API_BASE_URL + url;
    
    console.log('Making request to:', fullUrl); // Для отладки

    // Первый запрос с текущим токеном
    let response = await fetch(fullUrl, {
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
        response = await fetch(fullUrl, {
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
  async get<T = any>(url: string, params?: Record<string, any>, options: RequestInit = {}): Promise<T> {
    // Добавляем query параметры к URL
    const queryString = this.buildQueryString(params);
    const urlWithParams = `${url}${queryString}`;
    
    const response = await this.requestWithAuthRetry(urlWithParams, {
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