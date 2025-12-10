// src/components/pages/HomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CalendarDaysIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  ClockIcon,
  DocumentCheckIcon,
  UsersIcon,
  TrophyIcon,
  PresentationChartLineIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  const features = [
    {
      icon: <CalendarDaysIcon className="h-12 w-12 text-blue-600" />,
      title: 'Расписание в реальном времени',
      description: 'Всегда актуальное расписание выступлений с автоматическими обновлениями',
      color: 'bg-blue-50'
    },
    {
      icon: <UserGroupIcon className="h-12 w-12 text-green-600" />,
      title: 'Ролевая система доступа',
      description: 'Разные права для участников, жюри и организаторов',
      color: 'bg-green-50'
    },
    {
      icon: <ChartBarIcon className="h-12 w-12 text-purple-600" />,
      title: 'Цифровая оценка',
      description: 'Электронная система выставления оценок с детальными комментариями',
      color: 'bg-purple-50'
    },
    {
      icon: <DevicePhoneMobileIcon className="h-12 w-12 text-orange-600" />,
      title: 'Доступ с любого устройства',
      description: 'Работает на компьютерах, планшетах и смартфонах',
      color: 'bg-orange-50'
    },
    {
      icon: <ShieldCheckIcon className="h-12 w-12 text-red-600" />,
      title: 'Безопасность данных',
      description: 'Защищенное хранение информации с резервным копированием',
      color: 'bg-red-50'
    },
    {
      icon: <ClockIcon className="h-12 w-12 text-indigo-600" />,
      title: 'Экономия времени',
      description: '85% сокращение административной работы',
      color: 'bg-indigo-50'
    }
  ];

  const userTypes = [
    {
      role: 'Участники',
      icon: <UsersIcon className="h-8 w-8 text-blue-600" />,
      benefits: [
        'Знают время и место выступления',
        'Видят результаты в реальном времени',
        'Не нужно спрашивать организаторов'
      ],
      color: 'border-blue-200'
    },
    {
      role: 'Жюри',
      icon: <DocumentCheckIcon className="h-8 w-8 text-green-600" />,
      benefits: [
        'Легко отправляют оценки',
        'Дают письменные отзывы',
        'Отслеживают все презентации'
      ],
      color: 'border-green-200'
    },
    {
      role: 'Организаторы',
      icon: <PresentationChartLineIcon className="h-8 w-8 text-purple-600" />,
      benefits: [
        'Управляют секциями',
        'Генерируют статистику',
        'Отслеживают прогресс'
      ],
      color: 'border-purple-200'
    }
  ];

  const stats = [
    { value: '85%', label: 'Сэкономленное время', icon: <ClockIcon className="h-6 w-6" /> },
    { value: '100%', label: 'Цифровая прозрачность', icon: <ShieldCheckIcon className="h-6 w-6" /> },
    { value: '0', label: 'Бумажных форм', icon: <DocumentCheckIcon className="h-6 w-6" /> },
    { value: '3', label: 'Типа пользователей', icon: <UserGroupIcon className="h-6 w-6" /> }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px]" />
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center justify-center mb-6 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
                <span className="text-white text-sm font-semibold">Инновационный проект 2025</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Навигатор
                <span className="block text-3xl md:text-4xl lg:text-5xl text-blue-200 mt-2">
                  Информационная система для конференций
                </span>
              </h1>
              
              <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto">
                Преобразуем управление школьными конференциями, устраняя хаос и обеспечивая прозрачность
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                {isAuthenticated ? (
                  <Link
                    to="/login-redirect"
                    className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                  >
                    Перейти в панель управления
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                    >
                      Начать использовать
                      <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-transparent border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                    >
                      Войти в систему
                    </Link>
                  </>
                )}
              </div>
              
              {/* Stats Preview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center justify-center mb-2">
                      <div className="text-white/80">
                        {stat.icon}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-sm text-blue-200">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Solution Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-semibold mb-4">
                  Проблема
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Хаос в организации школьных конференций
                </h2>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mr-3">
                      <span className="text-red-600 text-sm">✗</span>
                    </div>
                    <span className="text-gray-700">Потерянные участники не знают, где и когда выступать</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mr-3">
                      <span className="text-red-600 text-sm">✗</span>
                    </div>
                    <span className="text-gray-700">Судьям сложно отслеживать все презентации</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mr-3">
                      <span className="text-red-600 text-sm">✗</span>
                    </div>
                    <span className="text-gray-700">Организаторы перегружены бумажной работой</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold mb-4">
                  Решение
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Навигатор — цифровая платформа для всех участников
                </h2>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <span className="text-green-600 text-sm">✓</span>
                    </div>
                    <span className="text-gray-700">Все расписания и результаты в реальном времени</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <span className="text-green-600 text-sm">✓</span>
                    </div>
                    <span className="text-gray-700">Простая цифровая система оценок</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <span className="text-green-600 text-sm">✓</span>
                    </div>
                    <span className="text-gray-700">Автоматизация всех организационных процессов</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Ключевые возможности системы
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Современные технологии для эффективного управления конференциями
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`${feature.color} rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-2`}
              >
                <div className="mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-700">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Для кого создана система
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Три типа пользователей, три уникальных интерфейса
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {userTypes.map((type, index) => (
              <div 
                key={index} 
                className={`bg-white rounded-2xl p-8 border-2 ${type.color} transition-all duration-300 hover:shadow-xl`}
              >
                <div className="flex items-center mb-6">
                  <div className="mr-4">
                    {type.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {type.role}
                  </h3>
                </div>
                
                <ul className="space-y-4">
                  {type.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1">
                        <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <Link
                    to={isAuthenticated ? "/dashboard" : "/register"}
                    className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-800"
                  >
                    Попробовать как {type.role.toLowerCase()}
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-indigo-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <TrophyIcon className="h-16 w-16 text-green-400 mx-auto mb-6" />
            
            <h2 className="text-4xl font-bold text-white mb-6">
              Готовы провести идеальную конференцию?
            </h2>
            
            <p className="text-xl text-blue-200 mb-10 max-w-2xl mx-auto">
              Присоединяйтесь к школам, которые уже используют Навигатор для организации успешных мероприятий
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-900 bg-green-400 rounded-xl hover:bg-green-300 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
               <span className="mr-2 relative group">
  <RocketLaunchIcon className="h-8 w-8 text-red-400 transition-all duration-300 group-hover:scale-110 group-hover:text-red-500 group-hover:rotate-12" />
  <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-300 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
  <div className="absolute -inset-2 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
</span>
                Начать бесплатно
              </Link>
              
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-transparent border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all duration-300"
              >
                Уже есть аккаунт? Войти
              </Link>
            </div>
            
            <div className="mt-12 pt-8 border-t border-white/20">
              <p className="text-blue-200 text-lg italic">
                "Делая конференции удобными, прозрачными и современными — по одной системе за раз."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="text-2xl font-bold mb-2">Навигатор</div>
              <p className="text-gray-400">Информационная система для конференций</p>
              <p className="text-gray-400 text-sm mt-4">© 2025 IS-TEXNOPARK. Все права защищены.</p>
            </div>
            
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Документация
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Контакты
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                О проекте
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;