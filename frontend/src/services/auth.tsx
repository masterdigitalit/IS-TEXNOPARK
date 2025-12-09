// src/services/auth.ts

export const API_BASE_URL = 'http://localhost:8000';

export interface User {
  id: number;
  email: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  full_name: string;
  short_name: string;
  role: 'admin' | 'student' | 'teacher' | 'referee';
  role_display: string;
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  created_at_formatted: string;
  last_login: string | null;
  last_login_at_formatted: string | null;
  permissions: string[];
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface AuthResponse {
  user: User;
  access: string;  // Обратите внимание: не tokens.access, а прямо access
  refresh: string; // То же самое
}

// Сохраняем обратную совместимость
export interface AuthTokens {
  access: string;
  refresh: string;
}

class JwtAuthService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      mode: 'cors' as RequestMode,
      credentials: 'include' as RequestCredentials,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    console.log('API Request:', {
      url,
      method: config.method,
      headers: config.headers,
    });

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || 
        errorData.message || 
        errorData.error || 
        `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    console.log('API Response:', data);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request('/api/v1/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Ваш API возвращает access и refresh напрямую, а не в объекте tokens
    this.setTokens({
      access: data.access,
      refresh: data.refresh,
    });
    this.setUser(data.user);

    return data;
  }

  async register(userData: {
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const data = await this.request('/api/v1/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    this.setTokens({
      access: data.access,
      refresh: data.refresh,
    });
    this.setUser(data.user);

    return data;
  }

  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const data = await this.request('/api/v1/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    });

    // Обновляем access token
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.access);
    }
    this.setCookie('access_token', data.access, 1);

    return data.access;
  }

  async getProfile(): Promise<User> {
    const token = this.getAccessToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }

    return await this.request('/api/v1/auth/profile/', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    const token = this.getAccessToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }

    const data = await this.request('/api/v1/auth/profile/', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    this.setUser(data);
    return data;
  }

  // Методы для работы с токенами
  setTokens(tokens: AuthTokens) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);
    }
    
    this.setCookie('access_token', tokens.access, 1); // 1 hour
    this.setCookie('refresh_token', tokens.refresh, 7 * 24); // 7 days
  }

  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  setUser(user: User) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
    this.setCookie('user_data', JSON.stringify(user), 7 * 24);
  }

  getUser(): User | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }

    this.deleteCookie('access_token');
    this.deleteCookie('refresh_token');
    this.deleteCookie('user_data');
    
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // Вспомогательные методы для работы с cookies
  private setCookie(name: string, value: string, hours: number) {
    if (typeof document !== 'undefined') {
      const expires = new Date();
      expires.setTime(expires.getTime() + hours * 60 * 60 * 1000);
      document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    }
  }

  private deleteCookie(name: string) {
    if (typeof document !== 'undefined') {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  }

  // Дополнительные методы
  hasPermission(permission: string): boolean {
    const user = this.getUser();
    return user ? user.permissions.includes(permission) : false;
  }

  isAdmin(): boolean {
    const user = this.getUser();
    return user ? user.is_staff || user.is_superuser : false;
  }
}

export const jwtAuthService = new JwtAuthService();