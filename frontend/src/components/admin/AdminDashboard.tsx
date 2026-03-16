// src/components/dashboards/AdminDashboard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
  UserGroupIcon,
  CogIcon,
  ChartBarIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  TrophyIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const stats = [
    { label: 'Всего пользователей', value: '1,234', icon: <UserGroupIcon className="h-6 w-6" />, color: 'bg-blue-500' },
    { label: 'Активные конференции', value: '12', icon: <AcademicCapIcon className="h-6 w-6" />, color: 'bg-green-500' },
    { label: 'Заявки на участие', value: '89', icon: <DocumentTextIcon className="h-6 w-6" />, color: 'bg-yellow-500' },
    { label: 'Всего оценок', value: '456', icon: <TrophyIcon className="h-6 w-6" />, color: 'bg-purple-500' },
  ];

  const quickActions = [
    { title: 'Управление пользователями', icon: <UserGroupIcon className="h-8 w-8" />, link: '/admin/users' },
    { title: 'Конференции', icon: <AcademicCapIcon className="h-8 w-8" />, link: '/admin/events' },
    { title: 'Настройки системы', icon: <CogIcon className="h-8 w-8" />, link: '/admin/settings' },
    { title: 'Отчеты и аналитика', icon: <ChartBarIcon className="h-8 w-8" />, link: '/admin/reports' },
  ];

  return (
    <div className="p-6 lg:p-8 transition-theme">
      {/* Заголовок */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Административная панель</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Управление системой и всеми пользователями</p>
          </div>
          <Link
            to="/events/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all-sm"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Создать событие
          </Link>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border border-gray-100 dark:border-slate-700 hover:shadow-elevated transition-all-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-4 rounded-2xl shadow-lg`}>
                <div className="text-white">{stat.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Быстрые действия */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 mb-8 border border-gray-100 dark:border-slate-700 transition-theme">
        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Быстрые действия</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="flex flex-col items-center justify-center p-6 border-2 border-gray-100 dark:border-slate-700 rounded-2xl hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all-lg group"
            >
              <div className="text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-all-sm">{action.icon}</div>
              <span className="text-center font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-300">{action.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Последние активности */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border border-gray-100 dark:border-slate-700 transition-theme">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Последние действия</h2>
          <div className="space-y-3">
            {['Новый пользователь зарегистрирован', 'Создана конференция "Наука 2025"', 'Обновлены настройки системы', 'Добавлен новый судья'].map((action, index) => (
              <div key={index} className="flex items-center p-4 bg-gradient-subtle dark:bg-slate-700/50 rounded-xl transition-theme">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-3 shadow-glow-green"></div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">{action}</span>
                <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">5 мин назад</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border border-gray-100 dark:border-slate-700 transition-theme">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Статус системы</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gradient-subtle dark:bg-slate-700/50 rounded-xl transition-theme">
              <span className="font-medium text-gray-700 dark:text-gray-300">Сервер</span>
              <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">Online</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-subtle dark:bg-slate-700/50 rounded-xl transition-theme">
              <span className="font-medium text-gray-700 dark:text-gray-300">База данных</span>
              <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">Стабильно</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-subtle dark:bg-slate-700/50 rounded-xl transition-theme">
              <span className="font-medium text-gray-700 dark:text-gray-300">API</span>
              <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">Работает</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-subtle dark:bg-slate-700/50 rounded-xl transition-theme">
              <span className="font-medium text-gray-700 dark:text-gray-300">Обновления</span>
              <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">Доступны</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;