// src/utils/errorHandler.ts

export interface ApiErrorResponse {
  [key: string]: string[] | string | { [key: string]: string[] };
  detail?: string;
  non_field_errors?: string[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: ApiErrorResponse,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ValidationErrors {
  [field: string]: string[];
}

/**
 * Обрабатывает ошибки API и возвращает форматированное сообщение
 */
export const handleApiError = (error: any): ApiError => {
  // Если это уже наш ApiError, просто возвращаем его
  if (error instanceof ApiError) {
    return error;
  }

  // Обработка axios/HTTP ошибок
  if (error.response) {
    const { status, data } = error.response;
    let message = getDefaultErrorMessage(status);
    const details = data as ApiErrorResponse;

    // Извлекаем конкретное сообщение об ошибке из ответа
    const extractedMessage = extractErrorMessage(details);
    if (extractedMessage) {
      message = extractedMessage;
    }

    return new ApiError(message, status, details, error);
  }

  // Обработка сетевых ошибок
  if (error.request) {
    return new ApiError(
      'Нет соединения с сервером. Проверьте подключение к интернету.',
      undefined,
      undefined,
      error
    );
  }

  // Обработка других ошибок
  return new ApiError(
    error.message || 'Произошла непредвиденная ошибка',
    undefined,
    undefined,
    error
  );
};

/**
 * Извлекает сообщение об ошибке из ответа API
 */
export const extractErrorMessage = (data: ApiErrorResponse): string | null => {
  if (!data) return null;

  // Django REST Framework формат
  if (typeof data === 'object') {
    // Ошибки валидации по полям
    for (const [field, messages] of Object.entries(data)) {
      if (Array.isArray(messages) && messages.length > 0) {
        return `${field === 'non_field_errors' ? '' : field + ': '}${messages[0]}`;
      }
    }

    // Простое сообщение detail
    if (data.detail) {
      return typeof data.detail === 'string' ? data.detail : String(data.detail);
    }

    // Если это строка
    if (typeof data === 'string') {
      return data;
    }
  }

  return null;
};

/**
 * Получает сообщение по умолчанию на основе статуса
 */
export const getDefaultErrorMessage = (status: number): string => {
  const messages: { [key: number]: string } = {
    400: 'Некорректный запрос',
    401: 'Неавторизованный доступ',
    403: 'Доступ запрещен',
    404: 'Ресурс не найден',
    409: 'Конфликт данных',
    422: 'Ошибка валидации данных',
    429: 'Слишком много запросов. Попробуйте позже',
    500: 'Внутренняя ошибка сервера',
    502: 'Проблема с подключением к серверу',
    503: 'Сервис временно недоступен',
    504: 'Время ожидания ответа истекло',
  };

  return messages[status] || 'Произошла ошибка при выполнении запроса';
};

/**
 * Извлекает ошибки валидации по полям
 */
export const extractFieldErrors = (data: ApiErrorResponse): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (data && typeof data === 'object') {
    for (const [field, messages] of Object.entries(data)) {
      if (Array.isArray(messages)) {
        errors[field] = messages;
      } else if (typeof messages === 'string') {
        errors[field] = [messages];
      }
    }
  }

  return errors;
};

/**
 * Проверяет, является ли ошибка ошибкой валидации (400 или 422)
 */
export const isValidationError = (error: ApiError): boolean => {
  return error.status === 400 || error.status === 422;
};

/**
 * Логирует ошибку в консоль (в продакшене можно отправлять в Sentry/LogRocket)
 */
export const logError = (error: ApiError, context?: string): void => {
  if (process.env.NODE_ENV === 'development') {
    console.group(context || 'API Error');
    console.error('Message:', error.message);
    console.error('Status:', error.status);
    console.error('Details:', error.details);
    console.error('Original:', error.originalError);
    console.groupEnd();
  }
  // Здесь можно добавить интеграцию с сервисами мониторинга
};