// Типы для модуля статистики и оценок

export interface EventRating {
  id: number;
  event: number;
  online_session: number | null;
  offline_session: number | null;
  participant: number;
  referee: number;
  grading_system: 'five_point' | 'pass_fail';
  score: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  referee_name: string;
  participant_name: string;
}

export interface EventStatistics {
  id: number;
  event: number;
  event_name: string;
  average_score: number | null;
  total_participants_rated: number;
  total_ratings_given: number;
  count_grade_5_total: number;
  count_grade_4_total: number;
  count_grade_3_total: number;
  count_grade_2_total: number;
  count_grade_1_total: number;
  count_pass_total: number;
  count_fail_total: number;
  most_popular_grade_total: string | null;
  session_grade_distribution: Record<string, {
    five_point: Record<number, number>;
    pass_fail: Record<number, number>;
  }>;
  session_averages: Record<string, number>;
  calculated_at: string;
}

export interface EventParticipantStatistics {
  id: number;
  event: number;
  participant: number;
  participant_name: string;
  participant_email: string;
  session_scores_count: Record<string, number>;
  final_score: number | null;
  average_score: number | null;
  most_popular_grades: string | null;
  calculated_at: string;
}

export interface LeaderboardEntry {
  position: number;
  participant_id: number;
  participant_name: string;
  average_score: number;
}

export interface RatingCreateData {
  event: number;
  online_session?: number | null;
  offline_session?: number | null;
  participant: number;
  referee: number;
  grading_system: 'five_point' | 'pass_fail';
  score: number;
  comment?: string;
}

export interface SessionStatistics {
  average_score: number | null;
  total_participants_rated: number;
  total_ratings_given: number;
  count_grade_5: number;
  count_grade_4: number;
  count_grade_3: number;
  count_grade_2: number;
  count_grade_1: number;
  count_pass: number;
  count_fail: number;
  most_popular_grade: string | null;
}
