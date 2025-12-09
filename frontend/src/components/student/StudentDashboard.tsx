// src/components/dashboards/StudentDashboard.tsx
import React from 'react';
import { CalendarDaysIcon, ClockIcon, TrophyIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import {Link} from 'react-router-dom';
const StudentDashboard = () => {
  const upcomingPresentations = [
    { title: 'Проект по физике', time: '10:00', room: 'Аудитория 101', status: 'Ожидает' },
    { title: 'Исследование по биологии', time: '14:30', room: 'Аудитория 203', status: 'Скоро' },
  ];

  const results = [
    { subject: 'Математика', score: 95, place: 1 },
    { subject: 'Программирование', score: 88, place: 2 },
    { subject: 'Физика', score: 92, place: 1 },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Панель студента</h1>
        <p className="text-gray-600 mt-2">Ваши выступления, результаты и расписание</p>
      </div>

      {/* Приветствие */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-2">Добро пожаловать!</h2>
        <p>У вас сегодня {upcomingPresentations.length} выступления</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Предстоящие выступления */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center">
                <CalendarDaysIcon className="h-6 w-6 mr-2 text-blue-600" />
                Ближайшие выступления
              </h2>
              <span className="text-sm text-blue-600 font-medium">Сегодня</span>
            </div>
            
            <div className="space-y-4">
              {upcomingPresentations.map((presentation, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                   <Link to={'/event/'+index}>
                  <div className="flex justify-between items-start">
                 
                    <div>
                      <h3 className="font-bold text-lg">{presentation.title}</h3>
                      <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {presentation.time}
                        </span>
                        <span className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 mr-1" />
                          {presentation.room}
                        </span>
                      </div>
                    </div>
                   
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      presentation.status === 'Ожидает' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {presentation.status}
                    </span>
                  </div>
                   </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Результаты */}
        <div>
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <TrophyIcon className="h-6 w-6 mr-2 text-yellow-600" />
              Ваши результаты
            </h2>
            
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{result.subject}</span>
                    <div className="flex items-center mt-1">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${result.score}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm font-bold">{result.score}%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{result.place}</div>
                    <div className="text-xs text-gray-500">место</div>
                  </div>
                </div>
              ))}
            </div>

           
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;