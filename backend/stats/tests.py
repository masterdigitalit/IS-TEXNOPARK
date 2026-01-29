from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from events.models import Event, EventParticipant, OnlineEventInfo, OfflineSessionsInfo
from user.models import User
from stats.models import EventRating, EventStatistics, EventParticipantStatistics


class EventRatingModelTest(TestCase):
    def setUp(self):
        # Создаем тестовых пользователей
        self.user1 = User.objects.create_user(
            email='participant@example.com',
            password='testpass123',
            first_name='Test',
            middle_name='Participant'
        )
        self.user2 = User.objects.create_user(
            email='referee@example.com',
            password='testpass123',
            first_name='Test',
            middle_name='Referee'
        )
        self.owner = User.objects.create_user(
            email='owner@example.com',
            password='testpass123',
            first_name='Test',
            middle_name='Owner'
        )
        
        # Создаем событие
        self.event = Event.objects.create(
            name='Test Event',
            description='Test Description',
            owner=self.owner
        )
        
        # Создаем участника и судью для события
        self.participant = EventParticipant.objects.create(
            event=self.event,
            user=self.user1,
            role='participant'
        )
        self.referee = EventParticipant.objects.create(
            event=self.event,
            user=self.user2,
            role='referee'
        )

    def test_create_rating(self):
        """Тестируем создание оценки"""
        rating = EventRating.objects.create(
            event=self.event,
            participant=self.participant,
            referee=self.user2,  # referee
            grading_system='five_point',
            score=5
        )

        self.assertEqual(rating.score, 5)
        self.assertEqual(rating.grading_system, 'five_point')
        self.assertEqual(rating.event, self.event)
        self.assertEqual(rating.participant, self.participant)
        self.assertEqual(rating.referee, self.user2)

    def test_create_rating_with_comment(self):
        """Тестируем создание оценки с комментарием"""
        rating = EventRating.objects.create(
            event=self.event,
            participant=self.participant,
            referee=self.user2,
            grading_system='five_point',
            score=4,
            comment="Хорошая работа, но можно лучше"
        )

        self.assertEqual(rating.score, 4)
        self.assertEqual(rating.comment, "Хорошая работа, но можно лучше")
        self.assertEqual(rating.grading_system, 'five_point')

    def test_rating_score_range(self):
        """Тестируем диапазон оценок для пятибалльной системы"""
        rating = EventRating(
            event=self.event,
            participant=self.participant,
            referee=self.user2,
            grading_system='five_point',
            score=6  # Недопустимая оценка
        )

        with self.assertRaises(ValidationError):
            rating.full_clean()

    def test_rating_with_online_session(self):
        """Тестируем создание оценки для онлайн-сессии"""
        # Создаем онлайн-сессию с будущей датой
        future_time = timezone.now() + timezone.timedelta(days=1)
        online_session = OnlineEventInfo.objects.create(
            event=self.event,
            session_name='Test Online Session',
            start_time=future_time
        )

        rating = EventRating.objects.create(
            event=self.event,
            online_session=online_session,
            participant=self.participant,
            referee=self.user2,
            grading_system='five_point',
            score=5
        )

        self.assertEqual(rating.score, 5)
        self.assertEqual(rating.online_session, online_session)
        self.assertIsNone(rating.offline_session)

    def test_rating_with_offline_session(self):
        """Тестируем создание оценки для оффлайн-сессии"""
        # Создаем оффлайн-сессию с будущей датой
        future_time = timezone.now() + timezone.timedelta(days=1)
        offline_session = OfflineSessionsInfo.objects.create(
            event=self.event,
            session_name='Test Offline Session',
            start_time=future_time
        )

        rating = EventRating.objects.create(
            event=self.event,
            offline_session=offline_session,
            participant=self.participant,
            referee=self.user2,
            grading_system='five_point',
            score=4
        )

        self.assertEqual(rating.score, 4)
        self.assertEqual(rating.offline_session, offline_session)
        self.assertIsNone(rating.online_session)

    def test_rating_validation_both_sessions(self):
        """Тестируем валидацию при указании обеих сессий"""
        # Создаем сессии с будущей датой
        future_time = timezone.now() + timezone.timedelta(days=1)
        online_session = OnlineEventInfo.objects.create(
            event=self.event,
            session_name='Test Online Session',
            start_time=future_time
        )

        offline_session = OfflineSessionsInfo.objects.create(
            event=self.event,
            session_name='Test Offline Session',
            start_time=future_time
        )

        rating = EventRating(
            event=self.event,
            online_session=online_session,
            offline_session=offline_session,
            participant=self.participant,
            referee=self.user2,
            grading_system='five_point',
            score=3
        )

        with self.assertRaises(ValidationError):
            rating.full_clean()

    def test_rating_pass_fail_valid(self):
        """Тестируем корректные оценки для системы зачет/незачет"""
        rating = EventRating.objects.create(
            event=self.event,
            participant=self.participant,
            referee=self.user2,
            grading_system='pass_fail',
            score=1  # Зачет
        )

        self.assertEqual(rating.score, 1)
        self.assertEqual(rating.grading_system, 'pass_fail')

    def test_rating_pass_fail_invalid(self):
        """Тестируем недопустимые оценки для системы зачет/незачет"""
        rating = EventRating(
            event=self.event,
            participant=self.participant,
            referee=self.user2,
            grading_system='pass_fail',
            score=2  # Недопустимая оценка для зачетной системы
        )

        with self.assertRaises(ValidationError):
            rating.full_clean()

    def test_unique_constraint_same_session(self):
        """Тестируем уникальность оценки в рамках одной сессии"""
        # Создаем онлайн-сессию с будущей датой
        future_time = timezone.now() + timezone.timedelta(days=1)
        online_session = OnlineEventInfo.objects.create(
            event=self.event,
            session_name='Test Online Session',
            start_time=future_time
        )

        # Создаем первую оценку для сессии
        EventRating.objects.create(
            event=self.event,
            online_session=online_session,
            participant=self.participant,
            referee=self.user2,
            grading_system='five_point',
            score=4
        )

        # Пытаемся создать вторую оценку тем же судьей для того же участника в той же сессии
        with self.assertRaises(ValidationError):
            rating = EventRating(
                event=self.event,
                online_session=online_session,
                participant=self.participant,
                referee=self.user2,
                grading_system='five_point',
                score=5
            )
            rating.full_clean()  # Вызываем валидацию

    def test_different_sessions_allow_multiple_ratings(self):
        """Тестируем, что разные сессии позволяют нескольким оценкам одного судьи для участника"""
        # Создаем две разные онлайн-сессии с будущими датами
        future_time1 = timezone.now() + timezone.timedelta(days=1)
        future_time2 = timezone.now() + timezone.timedelta(days=2)

        online_session1 = OnlineEventInfo.objects.create(
            event=self.event,
            session_name='Test Online Session 1',
            start_time=future_time1
        )

        online_session2 = OnlineEventInfo.objects.create(
            event=self.event,
            session_name='Test Online Session 2',
            start_time=future_time2
        )

        # Создаем оценки для разных сессий - это должно быть разрешено
        rating1 = EventRating.objects.create(
            event=self.event,
            online_session=online_session1,
            participant=self.participant,
            referee=self.user2,
            grading_system='five_point',
            score=4
        )

        rating2 = EventRating.objects.create(
            event=self.event,
            online_session=online_session2,
            participant=self.participant,
            referee=self.user2,
            grading_system='five_point',
            score=5
        )

        # Обе оценки должны быть созданы успешно
        self.assertEqual(rating1.score, 4)
        self.assertEqual(rating2.score, 5)

    def test_same_session_does_not_allow_multiple_ratings(self):
        """Тестируем, что одна и та же сессия не позволяет нескольким оценкам одного судьи для участника"""
        # Создаем одну онлайн-сессию с будущей датой
        future_time = timezone.now() + timezone.timedelta(days=1)

        online_session = OnlineEventInfo.objects.create(
            event=self.event,
            session_name='Test Online Session',
            start_time=future_time
        )

        # Создаем первую оценку для сессии
        rating1 = EventRating.objects.create(
            event=self.event,
            online_session=online_session,
            participant=self.participant,
            referee=self.user2,
            grading_system='five_point',
            score=4
        )

        # Пытаемся создать вторую оценку для той же сессии - это должно вызвать ошибку
        with self.assertRaises(ValidationError):
            rating2 = EventRating(
                event=self.event,
                online_session=online_session,
                participant=self.participant,
                referee=self.user2,
                grading_system='five_point',
                score=5
            )
            rating2.full_clean()  # Вызываем валидацию


class EventStatisticsModelTest(TestCase):
    def setUp(self):
        # Создаем тестовых пользователей
        self.user1 = User.objects.create_user(
            email='participant1@example.com',
            password='testpass123',
            first_name='Test',
            middle_name='Participant1'
        )
        self.user2 = User.objects.create_user(
            email='participant2@example.com',
            password='testpass123',
            first_name='Test',
            middle_name='Participant2'
        )
        self.referee = User.objects.create_user(
            email='referee@example.com',
            password='testpass123',
            first_name='Test',
            middle_name='Referee'
        )
        self.owner = User.objects.create_user(
            email='owner@example.com',
            password='testpass123',
            first_name='Test',
            middle_name='Owner'
        )
        
        # Создаем событие
        self.event = Event.objects.create(
            name='Test Event',
            description='Test Description',
            owner=self.owner
        )
        
        # Создаем участников и судью для события
        self.participant1 = EventParticipant.objects.create(
            event=self.event,
            user=self.user1,
            role='participant'
        )
        self.participant2 = EventParticipant.objects.create(
            event=self.event,
            user=self.user2,
            role='participant'
        )
        self.referee_participant = EventParticipant.objects.create(
            event=self.event,
            user=self.referee,
            role='referee'
        )

    def test_calculate_statistics(self):
        """Тестируем расчет статистики"""
        # Создаем несколько оценок
        EventRating.objects.create(
            event=self.event,
            participant=self.participant1,
            referee=self.referee,
            grading_system='five_point',
            score=4
        )
        EventRating.objects.create(
            event=self.event,
            participant=self.participant1,
            referee=self.owner,  # Владелец также может быть судьей
            grading_system='five_point',
            score=5
        )
        EventRating.objects.create(
            event=self.event,
            participant=self.participant2,
            referee=self.referee,
            grading_system='five_point',
            score=3
        )

        # Рассчитываем статистику
        stats = EventStatistics.calculate_for_event(self.event)

        # Проверяем, что статистика создана
        self.assertIsNotNone(stats)
        self.assertEqual(stats.total_ratings_given, 3)
        # Теперь total_participants_rated зависит от того, сколько участников имеют итоговую оценку
        # После пересчета статистики участников
        participant1_stats = EventParticipantStatistics.calculate_for_participant(self.event, self.participant1)
        participant2_stats = EventParticipantStatistics.calculate_for_participant(self.event, self.participant2)

        # У первого участника среднее (4+5)/2 = 4.5, округленное в большую сторону = 5
        # У второго участника только одна оценка = 3
        expected_participants_rated = 2  # Оба участника имеют итоговую оценку
        self.assertEqual(stats.total_participants_rated, expected_participants_rated)

        # Проверяем среднюю оценку по итоговым оценкам участников
        # У первого участника итоговая оценка: (4+5)/2 = 4.5 -> ceil(4.5) = 5
        # У второго участника итоговая оценка: 3 -> ceil(3) = 3
        # Среднее по итоговым оценкам: (5+3)/2 = 4.0
        import math
        participant1_final = math.ceil((4+5)/2)  # 5
        participant2_final = math.ceil(3)  # 3
        expected_average = (participant1_final + participant2_final) / 2  # 4.0
        self.assertAlmostEqual(float(stats.average_score), expected_average, places=2)

    def test_calculate_statistics_with_grade_distribution(self):
        """Тестируем расчет статистики с распределением оценок"""
        # Создаем оценки разных типов
        EventRating.objects.create(
            event=self.event,
            participant=self.participant1,
            referee=self.referee,
            grading_system='five_point',
            score=5
        )
        EventRating.objects.create(
            event=self.event,
            participant=self.participant1,
            referee=self.owner,
            grading_system='five_point',
            score=4
        )
        EventRating.objects.create(
            event=self.event,
            participant=self.participant2,
            referee=self.referee,
            grading_system='pass_fail',
            score=1  # зачет
        )
        EventRating.objects.create(
            event=self.event,
            participant=self.participant2,
            referee=self.owner,
            grading_system='pass_fail',
            score=0  # незачет
        )

        # Рассчитываем статистику
        stats = EventStatistics.calculate_for_event(self.event)

        # После пересчета статистики участников
        participant1_stats = EventParticipantStatistics.calculate_for_participant(self.event, self.participant1)
        participant2_stats = EventParticipantStatistics.calculate_for_participant(self.event, self.participant2)

        # У первого участника среднее (5+4)/2 = 4.5, округленное в большую сторону = 5
        # У второго участника нет пятибалльных оценок, поэтому итоговая оценка None
        # Поэтому в статистике события будет только одна итоговая оценка - 5
        self.assertEqual(stats.count_grade_5_total, 1)  # одна итоговая оценка 5 (от первого участника)
        self.assertEqual(stats.count_grade_4_total, 0)  # нет итоговых оценок 4
        self.assertEqual(stats.count_grade_3_total, 0)  # нет итоговых оценок 3
        self.assertEqual(stats.count_grade_2_total, 0)  # нет итоговых оценок 2
        self.assertEqual(stats.count_grade_1_total, 0)  # нет итоговых оценок 1
        self.assertEqual(stats.count_pass_total, 1)     # один зачет (из оригинальных оценок)
        self.assertEqual(stats.count_fail_total, 1)    # один незачет (из оригинальных оценок)

        # Проверяем, что средняя оценка рассчитывается по итоговым оценкам участников
        # Только у первого участника есть итоговая пятибалльная оценка (5), у второго - нет
        expected_average = 5.0  # только одна итоговая оценка (5)
        self.assertAlmostEqual(float(stats.average_score), expected_average, places=2)

    def test_calculate_session_statistics(self):
        """Тестируем расчет статистики для сессии"""
        # Создаем сессию с будущей датой
        future_time = timezone.now() + timezone.timedelta(days=1)
        online_session = OnlineEventInfo.objects.create(
            event=self.event,
            session_name='Test Online Session',
            start_time=future_time
        )

        # Создаем оценки для сессии
        EventRating.objects.create(
            event=self.event,
            online_session=online_session,
            participant=self.participant1,
            referee=self.referee,
            grading_system='five_point',
            score=5
        )
        EventRating.objects.create(
            event=self.event,
            online_session=online_session,
            participant=self.participant1,
            referee=self.owner,
            grading_system='five_point',
            score=4
        )
        EventRating.objects.create(
            event=self.event,
            online_session=online_session,
            participant=self.participant2,
            referee=self.referee,
            grading_system='pass_fail',
            score=1  # зачет
        )

        # Рассчитываем статистику для сессии
        session_stats = EventStatistics.calculate_for_session(online_session)

        # Проверяем счетчики оценок
        self.assertEqual(session_stats['count_grade_5'], 1)  # одна оценка 5
        self.assertEqual(session_stats['count_grade_4'], 1)  # одна оценка 4
        self.assertEqual(session_stats['count_pass'], 1)     # один зачет
        self.assertEqual(session_stats['count_fail'], 0)     # нет незачетов

        # Проверяем, что средняя оценка рассчитывается только для пятибалльной системы
        expected_average = (5 + 4) / 2  # 4.5
        self.assertAlmostEqual(session_stats['average_score'], expected_average, places=2)

    def test_calculate_participant_statistics(self):
        """Тестируем расчет статистики для участника"""
        # Создаем сессии
        online_session1 = OnlineEventInfo.objects.create(
            event=self.event,
            session_name='Test Online Session 1',
            start_time=timezone.now() + timezone.timedelta(days=1)
        )

        online_session2 = OnlineEventInfo.objects.create(
            event=self.event,
            session_name='Test Online Session 2',
            start_time=timezone.now() + timezone.timedelta(days=2)
        )

        # Создаем оценки для участника в разных сессиях
        EventRating.objects.create(
            event=self.event,
            online_session=online_session1,
            participant=self.participant1,
            referee=self.referee,
            grading_system='five_point',
            score=5
        )
        EventRating.objects.create(
            event=self.event,
            online_session=online_session2,
            participant=self.participant1,
            referee=self.owner,
            grading_system='five_point',
            score=4
        )
        EventRating.objects.create(
            event=self.event,
            participant=self.participant1,  # оценка за событие в целом
            referee=self.referee,
            grading_system='five_point',
            score=3
        )
        # Добавим зачет/незачет оценку, которая не должна учитываться в вычислении среднего
        EventRating.objects.create(
            event=self.event,
            online_session=online_session1,
            participant=self.participant1,
            referee=self.owner,
            grading_system='pass_fail',
            score=1  # зачет
        )

        # Рассчитываем статистику для участника
        participant_stats = EventParticipantStatistics.calculate_for_participant(self.event, self.participant1)

        # Проверяем, что итоговая оценка рассчитана только по пятибалльным оценкам
        # Среднее: (5 + 4 + 3) / 3 = 4.0
        expected_average = (5 + 4 + 3) / 3  # 4.0
        self.assertAlmostEqual(float(participant_stats.average_score), expected_average, places=2)
        # В данном случае, округление в большую сторону не требуется, так как 4.0 = 4.0
        self.assertEqual(participant_stats.final_score, expected_average)

        # Проверяем распределение по сессиям (включая зачет/незачет оценки)
        session_scores_count = participant_stats.session_scores_count
        self.assertIn(f"online_{online_session1.id}", session_scores_count)
        self.assertIn(f"online_{online_session2.id}", session_scores_count)
        self.assertIn("event", session_scores_count)
        self.assertEqual(session_scores_count[f"online_{online_session1.id}"], 2)  # 2 оценки (5 и зачет)
        self.assertEqual(session_scores_count[f"online_{online_session2.id}"], 1)  # 1 оценка (4)
        self.assertEqual(session_scores_count["event"], 1)  # 1 оценка (3)

    def test_calculate_participant_statistics_with_rounding(self):
        """Тестируем расчет статистики для участника с округлением в большую сторону"""
        # Создаем сессии
        online_session1 = OnlineEventInfo.objects.create(
            event=self.event,
            session_name='Test Online Session 1',
            start_time=timezone.now() + timezone.timedelta(days=1)
        )

        # Создаем оценки для участника, дающие среднее с дробной частью
        EventRating.objects.create(
            event=self.event,
            online_session=online_session1,
            participant=self.participant1,
            referee=self.referee,
            grading_system='five_point',
            score=5
        )
        EventRating.objects.create(
            event=self.event,
            online_session=online_session1,
            participant=self.participant1,
            referee=self.owner,
            grading_system='five_point',
            score=4
        )
        EventRating.objects.create(
            event=self.event,
            participant=self.participant1,  # оценка за событие в целом
            referee=self.referee,
            grading_system='five_point',
            score=4  # Теперь среднее будет (5+4+4)/3 = 13/3 = 4.333...
        )

        # Рассчитываем статистику для участника
        participant_stats = EventParticipantStatistics.calculate_for_participant(self.event, self.participant1)

        # Проверяем, что среднее значение вычислено правильно
        expected_average = (5 + 4 + 4) / 3  # 4.333...
        self.assertAlmostEqual(float(participant_stats.average_score), expected_average, places=2)

        # Проверяем, что итоговая оценка округлена в большую сторону до целого числа
        # 4.333... должно быть округлено до 5
        import math
        expected_final_score = math.ceil(expected_average)  # 5
        self.assertEqual(participant_stats.final_score, expected_final_score)