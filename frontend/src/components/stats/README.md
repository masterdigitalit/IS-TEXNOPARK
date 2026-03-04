# Модуль статистики и оценок (Stats)

Модуль для работы с системой оценок судей и статистикой мероприятий.

## Структура модуля

```
src/
├── types/
│   └── stats.ts                    # TypeScript типы для моделей stats
├── services/
│   └── stats-service.ts            # Сервис для работы с API статистики
└── components/
    └── stats/
        ├── index.ts                # Экспорт компонентов
        ├── StatisticsComponents.tsx # UI компоненты (StatCard, GradeDistribution, RatingCard, LeaderboardRow, ParticipantCard)
        ├── RatingForm.tsx          # Форма выставления оценки
        ├── EventStatisticsPage.tsx # Страница статистики события
        └── ParticipantStatisticsPage.tsx # Страница статистики участника
```

## Типы данных

### EventRating
Оценка судьи участнику:
- `id`, `event`, `online_session`, `offline_session`
- `participant`, `referee`
- `grading_system` ('five_point' | 'pass_fail')
- `score`, `comment`
- `created_at`, `updated_at`
- `referee_name`, `participant_name`

### EventStatistics
Статистика события:
- Средний балл, количество участников
- Распределение оценок (5, 4, 3, 2, 1, зачет/незачет)
- Статистика по сессиям

### EventParticipantStatistics
Статистика участника:
- Итоговый и средний балл
- Популярные оценки
- Количество оценок по сессиям

### LeaderboardEntry
Запись в лидерборде:
- Позиция, имя участника, средний балл

## API методы (stats-service.ts)

### Оценки
```typescript
// Получить все оценки для события
statsService.getEventRatings(eventId)

// Получить оценки для участника
statsService.getParticipantRatings(eventId, participantId)

// Выставить оценку
statsService.rateParticipant(ratingData)
```

### Статистика события
```typescript
// Получить статистику события
statsService.getEventStatistics(eventId)

// Пересчитать статистику
statsService.calculateEventStatistics(eventId)
```

### Лидерборд
```typescript
// Получить рейтинг участников
statsService.getEventLeaderboard(eventId)
```

### Статистика участников
```typescript
// Получить статистику всех участников
statsService.getEventParticipantStatistics(eventId)

// Получить итоговую оценку участника
statsService.getParticipantFinalScore(eventId, participantId)
```

### Статистика сессий
```typescript
statsService.getOnlineSessionStatistics(sessionId)
statsService.getOfflineSessionStatistics(sessionId)
```

## Компоненты

### StatCard
Карточка статистики с иконкой.

```tsx
<StatCard
  title="Средний балл"
  value={4.5}
  icon={<StarIcon className="h-6 w-6" />}
  color="blue"
  description="по всем участникам"
/>
```

### GradeDistribution
Гистограмма распределения оценок.

```tsx
<GradeDistribution
  grades={[
    { grade: 5, count: 10, percentage: 0 },
    { grade: 4, count: 5, percentage: 0 },
  ]}
/>
```

### RatingCard
Карточка отдельной оценки с комментарием.

```tsx
<RatingCard rating={rating} />
```

### LeaderboardRow
Строка лидерборда с позицией.

```tsx
<LeaderboardRow entry={leaderboardEntry} />
```

### ParticipantCard
Карточка участника со статистикой.

```tsx
<ParticipantCard participant={participantStats} />
```

### RatingForm
Модальное окно для выставления оценки.

```tsx
<RatingForm
  eventId={1}
  participantId={2}
  participantName="Иванов Иван"
  refereeId={userId}
  onSuccess={() => loadData()}
  onClose={() => setShowModal(false)}
/>
```

## Страницы

### EventStatisticsPage (`/events/:eventId/statistics`)
Страница статистики события с вкладками:
- **Обзор** - ключевые метрики, распределение оценок, топ участников
- **Рейтинг** - полный лидерборд
- **Оценки** - все оценки судей

### ParticipantStatisticsPage (`/events/:eventId/participant/:participantId/statistics`)
Страница статистики участника:
- Итоговый и средний балл
- Оценки по сессиям
- Список оценок от судей
- Кнопка выставления оценки

## Backend API

Все запросы идут на endpoints Django backend:

```
/api/v1/stats/
├── rate-participant/                 POST - выставить оценку
├── event/<id>/ratings/               GET  - оценки события
├── event/<id>/participant/<id>/ratings/  GET - оценки участника
├── event/<id>/statistics/            GET  - статистика события
├── event/<id>/calculate-statistics/  GET  - пересчет статистики
├── event/<id>/leaderboard/           GET  - лидерборд
├── event/<id>/participants/statistics/ GET - статистика участников
├── event/<id>/participant/<id>/final-score/ GET - итоговая оценка
├── session/online/<id>/statistics/   GET  - статистика онлайн-сессии
└── session/offline/<id>/statistics/  GET  - статистика оффлайн-сессии
```

## Примеры использования

### Получение статистики события
```typescript
import { statsService } from '@/services/stats-service';

const statistics = await statsService.getEventStatistics(eventId);
console.log(`Средний балл: ${statistics.average_score}`);
console.log(`Участников: ${statistics.total_participants_rated}`);
```

### Выставление оценки
```typescript
await statsService.rateParticipant({
  event: 1,
  participant: 5,
  referee: userId,
  grading_system: 'five_point',
  score: 4,
  comment: 'Хорошая работа!',
});
```

### Получение лидерборда
```typescript
const leaderboard = await statsService.getEventLeaderboard(eventId);
leaderboard.forEach(entry => {
  console.log(`${entry.position}. ${entry.participant_name} - ${entry.average_score}`);
});
```
