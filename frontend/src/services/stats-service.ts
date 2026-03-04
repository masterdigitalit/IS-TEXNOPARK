// src/services/stats-service.ts
import { apiClient } from './api-client';
import { ApiError, handleApiError } from '@/utils/error-handler';
import type {
  EventRating,
  EventStatistics,
  EventParticipantStatistics,
  LeaderboardEntry,
  RatingCreateData,
  SessionStatistics,
} from '@/types/stats';

class StatsService {
  // ==================== Оценки ====================

  // Получить все оценки для события
  async getEventRatings(eventId: number): Promise<EventRating[]> {
    try {
      const response = await apiClient.get(`/api/v1/stats/event/${eventId}/ratings/`);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Получить оценки для участника в событии
  async getParticipantRatings(eventId: number, participantId: number): Promise<EventRating[]> {
    try {
      const response = await apiClient.get(`/api/v1/stats/event/${eventId}/participant/${participantId}/ratings/`);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Получить оценки для онлайн-сессии
  async getOnlineSessionRatings(sessionId: number): Promise<EventRating[]> {
    try {
      const response = await apiClient.get(`/api/v1/stats/session/online/${sessionId}/ratings/`);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Получить оценки для оффлайн-сессии
  async getOfflineSessionRatings(sessionId: number): Promise<EventRating[]> {
    try {
      const response = await apiClient.get(`/api/v1/stats/session/offline/${sessionId}/ratings/`);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Выставить оценку участнику
  async rateParticipant(ratingData: RatingCreateData): Promise<EventRating> {
    try {
      const response = await apiClient.post('/api/v1/stats/rate-participant/', ratingData);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ==================== Статистика события ====================

  // Получить статистику события
  async getEventStatistics(eventId: number): Promise<EventStatistics> {
    try {
      const response = await apiClient.get(`/api/v1/stats/event/${eventId}/statistics/`);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Пересчитать статистику события
  async calculateEventStatistics(eventId: number): Promise<EventStatistics> {
    try {
      const response = await apiClient.get(`/api/v1/stats/event/${eventId}/calculate-statistics/`);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ==================== Лидерборд ====================

  // Получить лидерборд события
  async getEventLeaderboard(eventId: number): Promise<LeaderboardEntry[]> {
    try {
      const response = await apiClient.get(`/api/v1/stats/event/${eventId}/leaderboard/`);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ==================== Статистика участников ====================

  // Получить статистику всех участников события
  async getEventParticipantStatistics(eventId: number): Promise<EventParticipantStatistics[]> {
    try {
      const response = await apiClient.get(`/api/v1/stats/event/${eventId}/participants/statistics/`);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Получить итоговую оценку конкретного участника
  async getParticipantFinalScore(eventId: number, participantId: number): Promise<EventParticipantStatistics> {
    try {
      const response = await apiClient.get(`/api/v1/stats/event/${eventId}/participant/${participantId}/final-score/`);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ==================== Статистика сессий ====================

  // Получить статистику онлайн-сессии
  async getOnlineSessionStatistics(sessionId: number): Promise<SessionStatistics> {
    try {
      const response = await apiClient.get(`/api/v1/stats/session/online/${sessionId}/statistics/`);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Получить статистику оффлайн-сессии
  async getOfflineSessionStatistics(sessionId: number): Promise<SessionStatistics> {
    try {
      const response = await apiClient.get(`/api/v1/stats/session/offline/${sessionId}/statistics/`);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const statsService = new StatsService();
