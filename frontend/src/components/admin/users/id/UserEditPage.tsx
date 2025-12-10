// src/components/users/UserProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api-client';
import { 
  ArrowLeftIcon,
  ScaleIcon,
	
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  ShieldCheckIcon,
  KeyIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

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

interface UserFormData {
  email: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  role: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  password?: string;
}

interface Permission {
  id: string;
  name: string;
  codename: string;
  selected: boolean;
}

export const UserProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Состояния
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    role: 'student',
    is_active: true,
    is_staff: false,
    is_superuser: false,
    password: '',
  });
  
  const [permissions, setPermissions] = useState<Permission[]>([
    { id: 'view_profile', name: 'Просмотр профиля', codename: 'view_profile', selected: false },
    { id: 'edit_profile', name: 'Редактирование профиля', codename: 'edit_profile', selected: false },
    { id: 'manage_users', name: 'Управление пользователями', codename: 'manage_users', selected: false },
    { id: 'view_admin_panel', name: 'Просмотр админ-панели', codename: 'view_admin_panel', selected: false },
    { id: 'admin_panel', name: 'Доступ к админ-панели', codename: 'admin_panel', selected: false },
    { id: 'superuser', name: 'Суперпользователь', codename: 'superuser', selected: false },
    { id: 'view_courses', name: 'Просмотр курсов', codename: 'view_courses', selected: false },
    { id: 'submit_assignments', name: 'Отправка заданий', codename: 'submit_assignments', selected: false },
  ]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState(false);
  const [changes, setChanges] = useState(false);

  // Загрузка пользователя
  useEffect(() => {
    if (id) {
      loadUser(parseInt(id));
    }
  }, [id]);

  const loadUser = async (userId: number) => {
    setLoading(true);
    setError('');
    
    try {
      const userData = await apiClient.get<User>(`/api/v1/users/${userId}/`);
      setUser(userData);
      
      // Заполняем форму данными пользователя
      setFormData({
        email: userData.email,
        first_name: userData.first_name || '',
        middle_name: userData.middle_name || '',
        last_name: userData.last_name || '',
        phone: userData.phone || '',
        role: userData.role,
        is_active: userData.is_active,
        is_staff: userData.is_staff,
        is_superuser: userData.is_superuser,
        password: '',
      });
      
      // Обновляем выбранные права
      setPermissions(prev => 
        prev.map(permission => ({
          ...permission,
          selected: userData.permissions.includes(permission.codename)
        }))
      );
      
    } catch (err: any) {
      console.error('Ошибка загрузки пользователя:', err);
      setError(err.message || 'Не удалось загрузить данные пользователя');
    } finally {
      setLoading(false);
    }
  };

  // Обработка изменений формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    const newValue = type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));
    
    setChanges(true);
  };

  // Обработка изменения прав
  const handlePermissionChange = (permissionId: string) => {
    setPermissions(prev =>
      prev.map(permission =>
        permission.id === permissionId
          ? { ...permission, selected: !permission.selected }
          : permission
      )
    );
    setChanges(true);
  };

  // Сохранение изменений
  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Подготавливаем данные для отправки
      const dataToSend: any = { ...formData };
      
      // Убираем пароль если он пустой
      if (!dataToSend.password) {
        delete dataToSend.password;
      }
      
      // Добавляем выбранные права
      const selectedPermissions = permissions
        .filter(p => p.selected)
        .map(p => p.codename);
      
      dataToSend.permissions = selectedPermissions;
      
      // Отправляем запрос на обновление
      const updatedUser = await apiClient.patch<User>(`/api/v1/users/${user.id}/`, dataToSend);
      
      // Обновляем локальное состояние
      setUser(updatedUser);
      setSuccess('Изменения успешно сохранены');
      setChanges(false);
      setEditing(false);
      
      // Автоматически скрываем сообщение об успехе через 3 секунды
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err: any) {
      console.error('Ошибка сохранения:', err);
      setError(err.message || 'Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  // Сброс изменений
  const handleCancel = () => {
    if (user) {
      setFormData({
        email: user.email,
        first_name: user.first_name || '',
        middle_name: user.middle_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        role: user.role,
        is_active: user.is_active,
        is_staff: user.is_staff,
        is_superuser: user.is_superuser,
        password: '',
      });
      
      setPermissions(prev => 
        prev.map(permission => ({
          ...permission,
          selected: user.permissions.includes(permission.codename)
        }))
      );
    }
    
    setEditing(false);
    setChanges(false);
    setError('');
  };

  // Удаление пользователя
  const handleDelete = async () => {
    if (!user) return;
    
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.')) {
      return;
    }
    
    try {
      await apiClient.delete(`/api/v1/users/${user.id}/`);
      navigate('/admin/users');
    } catch (err: any) {
      setError(err.message || 'Не удалось удалить пользователя');
    }
  };

  // Быстрые действия
  const handleQuickAction = async (action: 'activate' | 'deactivate' | 'toggle_staff' | 'toggle_superuser') => {
    if (!user) return;
    
    const updates: any = {};
    
    switch (action) {
      case 'activate':
        updates.is_active = true;
        break;
      case 'deactivate':
        updates.is_active = false;
        break;
      case 'toggle_staff':
        updates.is_staff = !user.is_staff;
        break;
      case 'toggle_superuser':
        updates.is_superuser = !user.is_superuser;
        break;
    }
    
    try {
      const updatedUser = await apiClient.patch<User>(`/api/v1/users/${user.id}/`, updates);
      setUser(updatedUser);
      
      // Обновляем форму
      setFormData(prev => ({
        ...prev,
        ...updates,
      }));
      
      setSuccess('Действие успешно выполнено');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err: any) {
      setError(err.message || 'Не удалось выполнить действие');
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Получение имени для отображения
  const getDisplayName = () => {
    if (!user) return '';
    
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Загрузка данных пользователя...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen p-6">
        <button
          onClick={() => navigate('/admin/users')}
          className="mb-6 inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Назад к списку
        </button>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => navigate('/admin/users')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen p-6">
        <button
          onClick={() => navigate('/admin/users')}
          className="mb-6 inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Назад к списку
        </button>
        <div className="text-center py-12">
          <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Пользователь не найден</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Кнопка назад и заголовок */}
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Назад к списку пользователей
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {editing ? 'Редактирование пользователя' : 'Профиль пользователя'}
              </h1>
              <p className="text-gray-600">ID: {user.id}</p>
            </div>
            
            <div className="flex space-x-3">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PencilIcon className="h-5 w-5 mr-2" />
                  Редактировать
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    Отмена
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !changes}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <ScaleIcon className="h-5 w-5 mr-2" />
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Сообщения об ошибках/успехе */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
              <p className="text-green-800">{success}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Левая колонка - Основная информация */}
          <div className="lg:col-span-2 space-y-6">
            {/* Карточка основной информации */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={!editing}
                      className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Телефон
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <PhoneIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!editing}
                      className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                      }`}
                      placeholder="+7 (___) ___-__-__"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Имя
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    disabled={!editing}
                    className={`block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Отчество
                  </label>
                  <input
                    type="text"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleInputChange}
                    disabled={!editing}
                    className={`block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Фамилия
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    disabled={!editing}
                    className={`block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Роль
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    disabled={!editing}
                    className={`block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <option value="student">Студент</option>
                    <option value="teacher">Преподаватель</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
              </div>

              {/* Смена пароля (только при редактировании) */}
              {editing && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Смена пароля</h3>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Новый пароль (оставьте пустым, чтобы не менять)"
                      className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Минимум 8 символов. Оставьте поле пустым, если не хотите менять пароль.
                  </p>
                </div>
              )}
            </div>

            {/* Карточка прав доступа */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Права доступа</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permissions.map(permission => (
                  <div
                    key={permission.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      permission.selected
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    } ${!editing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => editing && handlePermissionChange(permission.id)}
                  >
                    <input
                      type="checkbox"
                      id={`perm-${permission.id}`}
                      checked={permission.selected}
                      onChange={() => editing && handlePermissionChange(permission.id)}
                      disabled={!editing}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`perm-${permission.id}`}
                      className="ml-3 text-sm font-medium text-gray-900 cursor-pointer"
                    >
                      {permission.name}
                      <span className="block text-xs text-gray-500 mt-1">
                        {permission.codename}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Правая колонка - Статус и действия */}
          <div className="space-y-6">
            {/* Карточка статуса */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Статус</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Активность</span>
                  <div className={`flex items-center ${editing ? 'cursor-pointer' : ''}`}>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      disabled={!editing}
                      className="sr-only"
                    />
                    <div
                      className={`relative inline-block h-6 w-11 rounded-full ${
                        formData.is_active ? 'bg-green-500' : 'bg-gray-300'
                      } ${editing ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      onClick={() => editing && handleInputChange({
                        target: {
                          name: 'is_active',
                          checked: !formData.is_active,
                          type: 'checkbox'
                        } as any
                      } as React.ChangeEvent<HTMLInputElement>)}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          formData.is_active ? 'translate-x-6' : 'translate-x-1'
                        } ${editing ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        style={{ top: '2px' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Персонал</span>
                  <div className={`flex items-center ${editing ? 'cursor-pointer' : ''}`}>
                    <input
                      type="checkbox"
                      name="is_staff"
                      checked={formData.is_staff}
                      onChange={handleInputChange}
                      disabled={!editing}
                      className="sr-only"
                    />
                    <div
                      className={`relative inline-block h-6 w-11 rounded-full ${
                        formData.is_staff ? 'bg-blue-500' : 'bg-gray-300'
                      } ${editing ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      onClick={() => editing && handleInputChange({
                        target: {
                          name: 'is_staff',
                          checked: !formData.is_staff,
                          type: 'checkbox'
                        } as any
                      } as React.ChangeEvent<HTMLInputElement>)}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          formData.is_staff ? 'translate-x-6' : 'translate-x-1'
                        } ${editing ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        style={{ top: '2px' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Суперпользователь</span>
                  <div className={`flex items-center ${editing ? 'cursor-pointer' : ''}`}>
                    <input
                      type="checkbox"
                      name="is_superuser"
                      checked={formData.is_superuser}
                      onChange={handleInputChange}
                      disabled={!editing}
                      className="sr-only"
                    />
                    <div
                      className={`relative inline-block h-6 w-11 rounded-full ${
                        formData.is_superuser ? 'bg-purple-500' : 'bg-gray-300'
                      } ${editing ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      onClick={() => editing && handleInputChange({
                        target: {
                          name: 'is_superuser',
                          checked: !formData.is_superuser,
                          type: 'checkbox'
                        } as any
                      } as React.ChangeEvent<HTMLInputElement>)}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          formData.is_superuser ? 'translate-x-6' : 'translate-x-1'
                        } ${editing ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        style={{ top: '2px' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Роль в системе</span>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {formData.role === 'admin' ? 'Администратор' : 
                     formData.role === 'teacher' ? 'Преподаватель' : 'Студент'}
                  </p>
                </div>
              </div>
            </div>

            {/* Карточка информации */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация</h2>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm text-gray-500">Зарегистрирован</div>
                    <div className="font-medium text-gray-900">
                      {formatDate(user.created_at)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm text-gray-500">Последний вход</div>
                    <div className="font-medium text-gray-900">
                      {user.last_login ? formatDate(user.last_login) : 'Никогда'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm text-gray-500">Верификация</div>
                    <div className="font-medium text-gray-900">
                      {user.is_verified ? 'Подтвержден' : 'Не подтвержден'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Карточка быстрых действий */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h2>
              
              <div className="space-y-3">
                {user.is_active ? (
                  <button
                    onClick={() => handleQuickAction('deactivate')}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700"
                  >
                    <XCircleIcon className="h-4 w-4 mr-2" />
                    Деактивировать
                  </button>
                ) : (
                  <button
                    onClick={() => handleQuickAction('activate')}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Активировать
                  </button>
                )}

                <button
                  onClick={() => handleQuickAction('toggle_staff')}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                  {user.is_staff ? 'Убрать из персонала' : 'Сделать персоналом'}
                </button>

                <button
                  onClick={handleDelete}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-800 hover:bg-red-900"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Удалить пользователя
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};