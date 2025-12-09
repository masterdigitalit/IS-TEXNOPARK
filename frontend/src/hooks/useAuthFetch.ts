// hooks/useAuthFetch.ts
import { useState, useCallback } from 'react';
import { jwtAuthService } from '../services/auth';

interface UseAuthFetchOptions {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export const useAuthFetch = <T>() => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit & UseAuthFetchOptions = {}) => {
      setIsLoading(true);
      setError(null);

      try {
        const token = jwtAuthService.getAccessToken();
        const headers = {
          'Content-Type': 'application/json',
          ...(token && !options.skipAuth ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        };

        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (response.status === 401 && !options.skipAuth) {
          // Попробовать обновить токен
          try {
            await jwtAuthService.refreshToken();
            // Повторить запрос с новым токеном
            const newToken = jwtAuthService.getAccessToken();
            const retryResponse = await fetch(url, {
              ...options,
              headers: {
                ...headers,
                Authorization: `Bearer ${newToken}`,
              },
            });

            if (!retryResponse.ok) {
              throw new Error(`HTTP error! status: ${retryResponse.status}`);
            }

            const result = await retryResponse.json();
            setData(result);
            return result;
          } catch (refreshError) {
            jwtAuthService.logout();
            throw new Error('Session expired. Please login again.');
          }
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearError = () => setError(null);
  const clearData = () => setData(null);

  return {
    data,
    error,
    isLoading,
    fetchWithAuth,
    clearError,
    clearData,
  };
};