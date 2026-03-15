// src/components/profile/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api-client';
import { 
  UserCircleIcon, 
  EnvelopeIcon, 
  KeyIcon, 
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

interface ProfileFormData {
  email: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  avatar_url?: string;
  role?: string;
  is_active?: boolean;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const ProfilePage = () => {
  const { user: authUser, updateProfile } = useAuth();
  const [user, setUser] = useState(authUser);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Состояния для форм
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    email: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    avatar_url: '',
  });

  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Режимы редактирования
  const [editingProfile, setEditingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Загружаем данные профиля
  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setProfileForm({
        email: authUser.email || '',
        first_name: authUser.first_name || '',
        middle_name: authUser.middle_name || '',
        last_name: authUser.last_name || '',
        phone: authUser.phone || '',
        avatar_url: authUser.avatar_url || '',
      });
    }
  }, [authUser]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  // Получаем цвет для роли
  const getRoleColor = () => {
    if (!user) return 'bg-gray-500';
    switch (user.role) {
      case 'admin': return 'bg-red-500';
      case 'user': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (!user) throw new Error('Пользователь не найден');

      // Подготавливаем данные для отправки
      const updateData = {
        email: profileForm.email,
        first_name: profileForm.first_name,
        middle_name: profileForm.middle_name,
        last_name: profileForm.last_name,
        phone: profileForm.phone,
        avatar_url: profileForm.avatar_url || null,
        role: user.role, // Сохраняем текущую роль
        is_active: user.is_active, // Сохраняем статус активности
      };

      // Прямой вызов PUT с URL и данными
      const updatedUser = await apiClient.put(`/api/v1/users/${user.id}/`, updateData);
      
      // Обновляем состояние
      setUser(updatedUser);
      updateProfile(updatedUser);
      setEditingProfile(false);
      setSuccessMessage('Профиль успешно обновлен');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Profile update error:', error);
      setErrorMessage(error.message || 'Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Валидация пароля
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setErrorMessage('Новый пароль и подтверждение не совпадают');
      setLoading(false);
      return;
    }
    
    if (passwordForm.new_password.length < 8) {
      setErrorMessage('Пароль должен содержать минимум 8 символов');
      setLoading(false);
      return;
    }

    try {
      if (!user) throw new Error('Пользователь не найден');

      // Прямой вызов POST для смены пароля
      await apiClient.put(`/api/v1/auth/${user.id}/`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      
      // Очищаем форму
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setChangingPassword(false);
      setSuccessMessage('Пароль успешно изменен');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Password change error:', error);
      setErrorMessage(error.message || 'Ошибка при изменении пароля');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-subtle dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle dark:from-slate-950 dark:to-slate-900 transition-theme py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Мой профиль</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Управление личной информацией</p>
        </div>

        {/* Сообщения */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-theme">
            <div className="flex items-center">
              <CheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
              <span className="text-emerald-800 dark:text-emerald-300 font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl transition-theme">
            <div className="flex items-center">
              <XMarkIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <span className="text-red-800 dark:text-red-300 font-medium">{errorMessage}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Основная информация */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border border-gray-100 dark:border-slate-700 transition-theme">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center text-gray-900 dark:text-white">
                <UserCircleIcon className="h-6 w-6 mr-2 text-blue-600" />
                Личные данные
              </h2>
              {!editingProfile && (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-all-sm"
                >
                  <PencilIcon className="h-5 w-5 mr-1" />
                  Редактировать
                </button>
              )}
            </div>

            {editingProfile ? (
              <form onSubmit={handleProfileSubmit}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Фамилия
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={profileForm.last_name}
                        onChange={handleProfileChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Имя
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={profileForm.first_name}
                        onChange={handleProfileChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Отчество
                      </label>
                      <input
                        type="text"
                        name="middle_name"
                        value={profileForm.middle_name}
                        onChange={handleProfileChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={profileForm.email}
                        onChange={handleProfileChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Телефон
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={profileForm.phone}
                        onChange={handleProfileChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProfile(false);
                        if (user) {
                          setProfileForm({
                            email: user.email || '',
                            first_name: user.first_name || '',
                            middle_name: user.middle_name || '',
                            last_name: user.last_name || '',
                            phone: user.phone || '',
                            avatar_url: user.avatar_url || '',
                          });
                        }
                      }}
                      className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-all-sm"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2.5 gradient-primary text-white rounded-xl hover:shadow-glow disabled:opacity-50 font-medium transition-all-lg shadow-lg"
                    >
                      {loading ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-4 transition-theme">
                <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">ФИО:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {user.last_name} {user.first_name} {user.middle_name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Email:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{user.email}</span>
                </div>
                <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Телефон:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{user.phone || 'Не указан'}</span>
                </div>
                <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Роль:</span>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getRoleColor()} text-white shadow-sm`}>
                    {user.role_display}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Смена пароля и информация */}
          <div className="space-y-6">
            {/* Смена пароля */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border border-gray-100 dark:border-slate-700 transition-theme">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center text-gray-900 dark:text-white">
                  <KeyIcon className="h-6 w-6 mr-2 text-red-500" />
                  Безопасность
                </h2>
                {!changingPassword && (
                  <button
                    onClick={() => setChangingPassword(true)}
                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-all-sm"
                  >
                    Сменить пароль
                  </button>
                )}
              </div>

              {changingPassword ? (
                <form onSubmit={handlePasswordSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Текущий пароль
                      </label>
                      <input
                        type="password"
                        name="current_password"
                        value={passwordForm.current_password}
                        onChange={handlePasswordChange}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Новый пароль
                      </label>
                      <input
                        type="password"
                        name="new_password"
                        value={passwordForm.new_password}
                        onChange={handlePasswordChange}
                        required
                        minLength={8}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Подтвердите пароль
                      </label>
                      <input
                        type="password"
                        name="confirm_password"
                        value={passwordForm.confirm_password}
                        onChange={handlePasswordChange}
                        required
                        minLength={8}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all-sm"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setChangingPassword(false);
                          setPasswordForm({
                            current_password: '',
                            new_password: '',
                            confirm_password: '',
                          });
                        }}
                        className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-all-sm"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 font-medium transition-all-lg"
                      >
                        {loading ? 'Смена...' : 'Сменить'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="text-gray-600 dark:text-gray-400 bg-gradient-subtle dark:bg-slate-700/50 rounded-xl p-4 transition-theme">
                  <p className="font-medium">Используйте сложный пароль для безопасности аккаунта</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Минимум 8 символов, включая цифры и специальные символы</p>
                </div>
              )}
            </div>

            {/* Информация об аккаунте */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border border-gray-100 dark:border-slate-700 transition-theme">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Информация об аккаунте</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gradient-subtle dark:bg-slate-700/50 rounded-xl transition-theme">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">ID:</span>
                  <span className="font-mono text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-600 px-2 py-1 rounded-lg">{user.id}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-subtle dark:bg-slate-700/50 rounded-xl transition-theme">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Статус:</span>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    user.is_active
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    {user.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-subtle dark:bg-slate-700/50 rounded-xl transition-theme">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Администратор:</span>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    user.is_superuser
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {user.is_superuser ? 'Да' : 'Нет'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-subtle dark:bg-slate-700/50 rounded-xl transition-theme">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Регистрация:</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{user.created_at_formatted}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;