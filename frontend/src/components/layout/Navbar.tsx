// src/components/layout/Navbar.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  HomeIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  TrophyIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  QuestionMarkCircleIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import NotificationBell from '../notifications/NotificationBell';
import { notificationService } from '../../services/notification-service';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
      user: [
        { name: 'Мои выступления', path: '/user/dashboard', icon: <AcademicCapIcon className="h-5 w-5" /> },
        { name: 'Результаты', path: '/user/results', icon: <TrophyIcon className="h-5 w-5" /> },
                { name: 'Конференции', path: '/user/events', icon: <AcademicCapIcon className="h-5 w-5" /> },
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

      case 'user': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass shadow-soft transition-theme">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Логотип и бренд */}
          <div className="flex items-center space-x-10">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all-lg transform group-hover:scale-105">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="text-lg font-semibold bg-gradient-to-r from-blue-700 to-blue-900 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent hidden md:inline">
                Навигатор
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigationLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all-sm ${
                    isActive(link.path)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  <span className="h-5 w-5 flex-shrink-0">{link.icon}</span>
                  <span>{link.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Правая часть */}
          <div className="flex items-center space-x-3">
            {/* Переключатель темы */}
            <button
              onClick={toggleTheme}
              className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all-sm hover:scale-105"
              aria-label="Переключить тему"
            >
              {theme === 'light' ? (
                <MoonIcon className="h-5 w-5" />
              ) : (
                <SunIcon className="h-5 w-5" />
              )}
            </button>

            {/* Колокольчик уведомлений */}
            {isAuthenticated && (
              <NotificationBell unreadCount={unreadCount} />
            )}

            {/* Помощь */}
            <Link
              to="/help"
              className="hidden md:flex p-2.5 text-gray-500 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all-sm hover:scale-105"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
              <span className="sr-only">Помощь</span>
            </Link>

            {/* User Section */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all-sm hover:shadow-md"
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 100)}
                >
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {user.short_name || user.email}
                    </span>
                    <div className="flex items-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor()} text-white shadow-sm`}>
                        {user.role_display}
                      </span>
                      {user.is_superuser && (
                        <span className="ml-1 text-yellow-500">⭐</span>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <div className={`w-10 h-10 ${getRoleColor()} rounded-xl flex items-center justify-center text-white font-bold shadow-md border-2 border-white dark:border-slate-700`}>
                      {getAvatarInitials()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-700 rounded-full"></div>
                  </div>

                  <ChevronDownIcon className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-all-sm ${
                    isDropdownOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                  }`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-elevated py-2 border border-gray-100 dark:border-slate-700 z-50 overflow-hidden transition-theme animate-in fade-in zoom-in-95 duration-200">
                    {/* User Info */}
                    <div className="px-5 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-b border-blue-100 dark:border-blue-800">
                      <div className="flex items-center space-x-3.5">
                        <div className={`w-14 h-14 ${getRoleColor()} rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-white dark:border-slate-700`}>
                          {getAvatarInitials()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{user.short_name || user.email}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                          <div className="flex items-center mt-1.5 space-x-1.5">
                            <span className="text-xs px-2.5 py-1 bg-white/80 dark:bg-slate-700/50 text-gray-700 dark:text-gray-300 rounded-full shadow-sm">
                              {user.role_display}
                            </span>
                            {user.is_superuser && (
                              <span className="text-xs px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full shadow-sm">Админ</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        to="/profile"
                        className="flex items-center space-x-3 px-5 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-all-sm"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <UserCircleIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">Мой профиль</span>
                      </Link>

                      <Link
                        to="/settings"
                        className="flex items-center space-x-3 px-5 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-all-sm"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <Cog6ToothIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">Настройки</span>
                      </Link>

                      <div className="border-t border-gray-100 dark:border-slate-700 my-2"></div>

                      <Link
                        to="/help"
                        className="flex items-center space-x-3 px-5 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-all-sm"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <QuestionMarkCircleIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">Помощь и поддержка</span>
                      </Link>

                      <div className="border-t border-gray-100 dark:border-slate-700 my-2"></div>

                      <button
                        onClick={() => {
                          logout();
                          setIsDropdownOpen(false);
                        }}
                        className="flex items-center space-x-3 w-full px-5 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition-all-sm"
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        <span className="font-medium">Выйти</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2.5">
                <Link
                  to="/login"
                  className="px-4 py-2 text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all-sm"
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 gradient-primary text-white rounded-xl hover:shadow-glow transition-all-lg font-medium shadow-md hover:scale-105"
                >
                  Регистрация
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all-sm hover:scale-105"
            >
              <div className="w-6 h-6 flex flex-col justify-center space-y-1.5">
                <div className={`h-0.5 w-6 bg-gray-600 dark:bg-gray-400 transition-all-sm ${
                  isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''
                }`}></div>
                <div className={`h-0.5 w-6 bg-gray-600 dark:bg-gray-400 transition-all-sm ${
                  isMobileMenuOpen ? 'opacity-0' : ''
                }`}></div>
                <div className={`h-0.5 w-6 bg-gray-600 dark:bg-gray-400 transition-all-sm ${
                  isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
                }`}></div>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-2 pt-4 border-t border-gray-100 dark:border-slate-700">
            <div className="space-y-1.5 pb-4">
              {navigationLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl ${
                    isActive(link.path)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
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
                    className="flex items-center space-x-3 px-4 py-3 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span>Вход</span>
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center space-x-3 px-4 py-3 gradient-primary text-white rounded-xl shadow-md"
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
                    className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"
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
                    className="flex items-center space-x-3 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
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