// src/components/dashboards/AdminDashboard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  UserGroupIcon, 
  CogIcon, 
  ChartBarIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  TrophyIcon
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
    { title: 'Конференции', icon: <AcademicCapIcon className="h-8 w-8" />, link: '/admin/conferences' },
    { title: 'Настройки системы', icon: <CogIcon className="h-8 w-8" />, link: '/admin/settings' },
    { title: 'Отчеты и аналитика', icon: <ChartBarIcon className="h-8 w-8" />, link: '/admin/reports' },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Административная панель</h1>
        <p className="text-gray-600 mt-2">Управление системой и всеми пользователями</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-full`}>
                <div className="text-white">{stat.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Быстрые действия */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-6">Быстрые действия</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="flex flex-col items-center justify-center p-6 border-2 border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
            >
              <div className="text-blue-600 mb-3">{action.icon}</div>
              <span className="text-center font-medium">{action.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Последние активности */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-6">Последние действия</h2>
          <div className="space-y-4">
            {['Новый пользователь зарегистрирован', 'Создана конференция "Наука 2025"', 'Обновлены настройки системы', 'Добавлен новый судья'].map((action, index) => (
              <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span>{action}</span>
                <span className="ml-auto text-sm text-gray-500">5 мин назад</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-6">Статус системы</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Сервер</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">Online</span>
            </div>
            <div className="flex justify-between items-center">
              <span>База данных</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">Стабильно</span>
            </div>
            <div className="flex justify-between items-center">
              <span>API</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">Работает</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Обновления</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">Доступны</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;