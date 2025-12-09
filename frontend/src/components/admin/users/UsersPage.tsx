// src/components/UserList.tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/services/api-client';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircleIcon,
  XCircleIcon,
  UserPlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Типы на основе вашего API ответа
interface User {
  id: number;
  email: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  full_name: string;
  short_name: string;
  role: string;
  role_display: string;
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  created_at_formatted: string;
  last_login: string | null;
  last_login_at_formatted: string | null;
  permissions: string[];
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}

export const UserList: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Загрузка пользователей
  const loadUsers = async (pageNumber = 1) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await apiClient.get<ApiResponse>('/api/v1/users/', {
        params: {
          page: pageNumber,
          page_size: 10,
        },
      });

      setUsers(response.results);
      setTotalCount(response.count);
      setTotalPages(Math.ceil(response.count / 10));
      setPage(pageNumber);
      
    } catch (err: any) {
      console.error('Ошибка загрузки:', err);
      setError(err.message || 'Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, []);

  const handlePrevPage = () => {
    if (page > 1) loadUsers(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) loadUsers(page + 1);
  };

  const toggleUserStatus = async (userId: number, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation(); // Останавливаем всплытие, чтобы строка не кликалась
    e.preventDefault();
    
    try {
      await apiClient.patch(`/api/v1/users/${userId}/`, {
        is_active: !currentStatus,
      });
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, is_active: !currentStatus }
            : user
        )
      );
      
    } catch (err: any) {
      setError(err.message || 'Не удалось обновить статус');
    }
  };

  // Клик по строке таблицы
  const handleRowClick = (userId: number) => {
    navigate(`/admin/users/${userId}`);
  };

  // Навигация к созданию пользователя
  const navigateToCreateUser = () => {
    navigate('/admin/users/create');
  };

  // Статистика
  const activeCount = users.filter(u => u.is_active).length;
  const staffCount = users.filter(u => u.is_staff).length;
  const adminCount = users.filter(u => u.is_superuser).length;

  // Форматирование даты
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Получение имени пользователя для отображения
  const getUserDisplayName = (user: User): string => {
    if (user.short_name && user.short_name.trim()) {
      return user.short_name;
    }
    if (user.full_name && user.full_name.trim()) {
      return user.full_name;
    }
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.email.split('@')[0];
  };

  return (
    <div className="p-6">
      {/* Заголовок и кнопки */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Пользователи системы</h1>
          <p className="text-gray-600 mt-1">Всего пользователей: {totalCount}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => loadUsers(page)}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
          <button
            onClick={navigateToCreateUser}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Добавить пользователя
          </button>
        </div>
      </div>

      {/* Панель статистики */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Всего</div>
          <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Активных</div>
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Персонал</div>
          <div className="text-2xl font-bold text-blue-600">{staffCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Админы</div>
          <div className="text-2xl font-bold text-purple-600">{adminCount}</div>
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <p className="text-red-800 font-medium">{error}</p>
              <button 
                onClick={() => loadUsers(page)}
                className="mt-1 text-sm text-red-600 hover:text-red-800 underline"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Загрузка */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Загрузка пользователей...</p>
        </div>
      )}

      {/* Таблица пользователей */}
      {!loading && users.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Роль
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата регистрации
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr 
                  key={user.id} 
                  onClick={() => handleRowClick(user.id)}
                  className={`
                    cursor-pointer transition-colors
                    hover:bg-blue-50 active:bg-blue-100
                    ${selectedUserId === user.id ? 'bg-blue-50' : ''}
                    ${!user.is_active ? 'opacity-70' : ''}
                  `}
                  onMouseEnter={() => setSelectedUserId(user.id)}
                  onMouseLeave={() => setSelectedUserId(null)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={getUserDisplayName(user)}
                          className="h-10 w-10 rounded-full mr-3"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
                          <span className="text-white font-semibold text-sm">
                            {getUserDisplayName(user).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          {getUserDisplayName(user)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.phone || 'Нет телефона'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {user.role_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.is_active ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Активен
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          <XCircleIcon className="h-3 w-3 mr-1" />
                          Неактивен
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={(e) => toggleUserStatus(user.id, user.is_active, e)}
                      className={`
                        px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                        ${user.is_active
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 hover:border-red-300'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 hover:border-green-300'
                        }
                      `}
                    >
                      {user.is_active ? 'Деактивировать' : 'Активировать'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Показано <span className="font-medium">{users.length}</span> из{' '}
                  <span className="font-medium">{totalCount}</span> пользователей
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Назад
                  </button>
                  <span className="text-sm text-gray-700">
                    Страница {page} из {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Нет данных */}
      {!loading && users.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <p className="text-gray-600 mb-4">Пользователи не найдены</p>
          <button
            onClick={navigateToCreateUser}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Создать первого пользователя
          </button>
        </div>
      )}
    </div>
  );
};