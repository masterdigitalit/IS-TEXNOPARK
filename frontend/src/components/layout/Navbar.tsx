// src/components/layout/Navbar.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  HomeIcon, 
  UserCircleIcon, 
  Cog6ToothIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  TrophyIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';
import NotificationBell from '../notifications/NotificationBell';
import { notificationService } from '../../services/notification-service';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Загружаем количество непрочитанных уведомлений
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!isAuthenticated) return;
      
      try {
        const data = await notificationService.getUnreadCount();
        setUnreadCount(data.count);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnreadCount();
    
    // Опционально: обновляем каждые 30 секунд
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Навигация в зависимости от роли
  const getRoleNavigation = () => {
    if (!user) return [];

    const baseLinks = [
      { name: 'Главная', path: '/', icon: <HomeIcon className="h-5 w-5" /> }
    ];

    const roleLinks: Record<string, Array<{name: string, path: string, icon: React.ReactNode}>> = {
      admin: [
        { name: 'Панель управления', path: '/admin/dashboard', icon: <Cog6ToothIcon className="h-5 w-5" /> },
        { name: 'Пользователи', path: '/admin/users', icon: <UserCircleIcon className="h-5 w-5" /> },
        { name: 'Конференции', path: '/admin/events', icon: <AcademicCapIcon className="h-5 w-5" /> },
      ],
      teacher: [
        { name: 'Мои классы', path: '/teacher/dashboard', icon: <AcademicCapIcon className="h-5 w-5" /> },
        { name: 'Конференции', path: '/teacher/events', icon: <ClipboardDocumentCheckIcon className="h-5 w-5" /> },
      ],
      referee: [
        { name: 'Оценивание', path: '/referee/dashboard', icon: <ClipboardDocumentCheckIcon className="h-5 w-5" /> },
        { name: 'Мои оценки', path: '/referee/assessments', icon: <TrophyIcon className="h-5 w-5" /> },
      ],
      student: [
        { name: 'Мои выступления', path: '/student/dashboard', icon: <AcademicCapIcon className="h-5 w-5" /> },
        { name: 'Результаты', path: '/student/results', icon: <TrophyIcon className="h-5 w-5" /> },
      ],
    };

    return [...baseLinks, ...(roleLinks[user.role] || [])];
  };

  const navigationLinks = getRoleNavigation();

  // Определяем активную ссылку
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Получаем инициалы для аватара
  const getAvatarInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  // Получаем цвет для роли
  const getRoleColor = () => {
    if (!user) return 'bg-gray-500';
    
    switch (user.role) {
      case 'admin': return 'bg-red-500';
      case 'teacher': return 'bg-blue-500';
      case 'referee': return 'bg-green-500';
      case 'student': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-100">
      <div className="p-6">
        <div className="flex justify-between items-center">
          {/* Логотип и бренд */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="text-xl font-bold text-gray-800 hidden md:inline">
                Навигатор
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigationLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="h-4 w-4 mr-4">{link.icon}</span>
                  <span>{link.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Правая часть */}
          <div className="flex items-center space-x-4">
            {/* Колокольчик уведомлений */}
            {isAuthenticated && (
              <NotificationBell unreadCount={unreadCount} />
            )}

            {/* Помощь */}
            <Link
              to="/help"
              className="hidden md:block p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
              <span className="sr-only">Помощь</span>
            </Link>

            {/* User Section */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 100)}
                >
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-800">
                      {user.short_name || user.email}
                    </span>
                    <div className="flex items-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor()} text-white`}>
                        {user.role_display}
                      </span>
                      {user.is_superuser && (
                        <span className="ml-1 text-yellow-500">⭐</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className={`w-10 h-10 ${getRoleColor()} rounded-full flex items-center justify-center text-white font-bold`}>
                      {getAvatarInitials()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  
                  <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg py-2 border border-gray-100 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 ${getRoleColor()} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                          {getAvatarInitials()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.short_name || user.email}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex items-center mt-1">
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                              {user.role_display}
                            </span>
                            {user.is_superuser && (
                              <span className="ml-1 text-xs text-yellow-600">Админ</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        to="/profile"
                        className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <UserCircleIcon className="h-5 w-5 text-gray-500" />
                        <span>Мой профиль</span>
                      </Link>
                      
                      <Link
                        to="/settings"
                        className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
                        <span>Настройки</span>
                      </Link>
                      
                      <div className="border-t border-gray-100 my-2"></div>
                      
                      <Link
                        to="/help"
                        className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <QuestionMarkCircleIcon className="h-5 w-5 text-gray-500" />
                        <span>Помощь и поддержка</span>
                      </Link>
                      
                      <div className="border-t border-gray-100 my-2"></div>
                      
                      <button
                        onClick={() => {
                          logout();
                          setIsDropdownOpen(false);
                        }}
                        className="flex items-center space-x-3 w-full px-4 py-3 text-red-600 hover:bg-red-50"
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        <span>Выйти</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow transition-all"
                >
                  Регистрация
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                <div className={`h-0.5 w-6 bg-gray-600 transition-transform ${
                  isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''
                }`}></div>
                <div className={`h-0.5 w-6 bg-gray-600 transition-opacity ${
                  isMobileMenuOpen ? 'opacity-0' : ''
                }`}></div>
                <div className={`h-0.5 w-6 bg-gray-600 transition-transform ${
                  isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
                }`}></div>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-100">
            <div className="space-y-2">
              {navigationLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                    isActive(link.path)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="h-5 w-5">{link.icon}</span>
                  <span className="font-medium">{link.name}</span>
                </Link>
              ))}

              {!isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    className="flex items-center space-x-3 px-4 py-3 text-blue-600 hover:bg-blue-50 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span>Вход</span>
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center space-x-3 px-4 py-3 bg-blue-600 text-white rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <UserCircleIcon className="h-5 w-5" />
                    <span>Регистрация</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <UserCircleIcon className="h-5 w-5" />
                    <span>Профиль</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span>Выйти</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;