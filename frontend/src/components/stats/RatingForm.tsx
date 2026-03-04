import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { statsService } from '@/services/stats-service';
import { handleApiError, extractFieldErrors } from '@/utils/error-handler';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

interface RatingFormProps {
  eventId: number;
  participantId: number;
  participantName: string;
  onlineSessionId?: number | null;
  offlineSessionId?: number | null;
  refereeId: number;
  onSuccess?: () => void;
  onClose: () => void;
}

interface FormData {
  grading_system: 'five_point' | 'pass_fail';
  score: number;
  comment: string;
}

interface FormErrors {
  [key: string]: string[];
}

export const RatingForm: React.FC<RatingFormProps> = ({
  eventId,
  participantId,
  participantName,
  onlineSessionId,
  offlineSessionId,
  refereeId,
  onSuccess,
  onClose,
}) => {
  const [formData, setFormData] = useState<FormData>({
    grading_system: 'five_point',
    score: 5,
    comment: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      await statsService.rateParticipant({
        event: eventId,
        online_session: onlineSessionId,
        offline_session: offlineSessionId,
        participant: participantId,
        referee: refereeId,
        grading_system: formData.grading_system,
        score: formData.score,
        comment: formData.comment || undefined,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (error) {
      const apiError = handleApiError(error);
      if (apiError.details) {
        const fieldErrors = extractFieldErrors(apiError.details);
        setErrors(fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderScoreButtons = () => {
    if (formData.grading_system === 'pass_fail') {
      return (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, score: 1 })}
            className={cn(
              'flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all',
              formData.score === 1
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            Зачет
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, score: 0 })}
            className={cn(
              'flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all',
              formData.score === 0
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            Незачет
          </button>
        </div>
      );
    }

    return (
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => setFormData({ ...formData, score })}
            className={cn(
              'w-12 h-12 rounded-lg border-2 font-semibold text-lg transition-all',
              formData.score === score
                ? 'border-blue-500 bg-blue-50 text-blue-700 scale-110'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            {score}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {showSuccess ? (
          <div className="p-8 text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Оценка выставлена!
            </h3>
            <p className="text-gray-600">
              Статистика участника обновлена
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Оценка участника
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Участник</p>
                <p className="font-medium text-gray-900">{participantName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Система оценивания
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, grading_system: 'five_point', score: 5 })}
                    className={cn(
                      'flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all',
                      formData.grading_system === 'five_point'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    5-балльная
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, grading_system: 'pass_fail', score: 1 })}
                    className={cn(
                      'flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all',
                      formData.grading_system === 'pass_fail'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    Зачет/незачет
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Оценка
                </label>
                {renderScoreButtons()}
                {errors.score && (
                  <p className="mt-2 text-sm text-red-600">{errors.score[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Комментарий (необязательно)
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Напишите комментарий к оценке..."
                />
                {errors.comment && (
                  <p className="mt-2 text-sm text-red-600">{errors.comment[0]}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
