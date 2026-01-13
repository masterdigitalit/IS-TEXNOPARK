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

  private isFormData(body: any): boolean {
    return body instanceof FormData;
  }

  private async requestWithAuthRetry(url: string, options: RequestInit = {}): Promise<Response> {
    let accessToken = jwtAuthService.getAccessToken();
    
    if (!accessToken) {
      throw new Error('No authentication token');
    }

    // Добавляем базовый URL
    const fullUrl = API_BASE_URL + url;
    
    console.log('Making request to:', fullUrl, 'Method:', options.method);

    // Подготавливаем headers
    const headers: HeadersInit = {
      'Authorization': `Bearer ${accessToken}`,
    };

    // Только для НЕ FormData устанавливаем Content-Type
    if (!this.isFormData(options.body)) {
      headers['Content-Type'] = 'application/json';
    }

    // Объединяем headers
    const finalHeaders = {
      ...headers,
      ...options.headers,
    };

    console.log('Request headers:', finalHeaders);
    console.log('Is FormData:', this.isFormData(options.body));

    // Первый запрос с текущим токеном
    let response = await fetch(fullUrl, {
      ...options,
      headers: finalHeaders,
    });

    console.log('Response status:', response.status);

    // Если токен истек (401 ошибка), пробуем обновить
    if (response.status === 401) {
      try {
        // Обновляем access token
        accessToken = await jwtAuthService.refreshToken();
        
        // Обновляем заголовок с новым токеном
        finalHeaders['Authorization'] = `Bearer ${accessToken}`;
        
        // Повторяем запрос с новым токеном
        response = await fetch(fullUrl, {
          ...options,
          headers: finalHeaders,
        });

        console.log('Retry response status:', response.status);
      } catch (refreshError) {
        // Если refresh не удался - разлогиниваем
        jwtAuthService.logout();
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      console.error('Response not OK, status:', response.status);
      let errorData;
      try {
        errorData = await response.json();
        console.error('Error response data:', errorData);
      } catch (e) {
        errorData = {};
      }
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

  async post<T = any>(url: string, data?: any, options: RequestInit = {}): Promise<T> {
    const response = await this.requestWithAuthRetry(url, {
      ...options,
      method: 'POST',
      body: this.isFormData(data) ? data : JSON.stringify(data),
    });
    return response.json();
  }

  async put<T = any>(url: string, data: any, options: RequestInit = {}): Promise<T> {
    const response = await this.requestWithAuthRetry(url, {
      ...options,
      method: 'PUT',
      body: this.isFormData(data) ? data : JSON.stringify(data),
    });
    return response.json();
  }

  async patch<T = any>(url: string, data: any, options: RequestInit = {}): Promise<T> {
    const response = await this.requestWithAuthRetry(url, {
      ...options,
      method: 'PATCH',
      body: this.isFormData(data) ? data : JSON.stringify(data),
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

  // Специальный метод для загрузки файлов
  async uploadFile<T = any>(url: string, formData: FormData): Promise<T> {
    return this.post(url, formData);
  }
}

export const apiClient = new ApiClient();