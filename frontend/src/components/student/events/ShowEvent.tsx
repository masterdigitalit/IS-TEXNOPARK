// src/components/events/EventDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api-client';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  VideoCameraIcon,
  MapPinIcon,
  LinkIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  ArrowRightCircleIcon,
  BellAlertIcon,
  EnvelopeIcon,
  DocumentIcon,
  DocumentTextIcon,
  PaperClipIcon,
  CloudArrowUpIcon,
  TrashIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  FolderIcon,
  FolderPlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

// Типы данных
interface User {
  id: number;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface OnlineSession {
  id: number;
  session_name: string;
  start_time: string;
  end_time: string | null;
  session_notes: string | null;
  link: string | null;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  platform: string;
  access_code: string | null;
  max_participants: number | null;
  is_active: boolean;
  duration_minutes: number | null;
  is_ongoing: boolean;
  is_upcoming: boolean;
  is_past: boolean;
  attendees_count: number;
}

interface OfflineSession {
  id: number;
  session_name: string;
  start_time: string;
  end_time: string | null;
  session_notes: string | null;
  address: string | null;
  room: string | null;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  max_participants: number | null;
  is_active: boolean;
  duration_minutes: number | null;
  is_ongoing: boolean;
  is_upcoming: boolean;
  is_past: boolean;
  full_location: string;
}

interface Participant {
  id: number;
  user: User;
  registered_at: string;
  role: string;
  is_confirmed: boolean;
}

// Типы для файлов
interface FileCategory {
  value: string;
  label: string;
}

interface EventFile {
  id: number;
  category: string;
  description: string;
  is_public: boolean;
  file_name: string;
  file_size: number;
  file_size_display: string;
  file_url: string;
  uploaded_at: string;
  display_order: number;
}

// Общий интерфейс для отображения файлов
interface DisplayFile {
  id: number;
  name: string;
  original_name: string;
  file_url: string;
  category: string;
  file_size: number;
  file_size_display: string;
  description: string | null;
  is_public: boolean;
  uploaded_by: User;
  uploaded_at: string;
  download_count: number;
  mime_type?: string;
}

interface FileUploadForm {
  name: string;
  description: string;
  category: string;
  is_public: boolean;
  file: File | null;
}

interface Event {
  id: number;
  owner: User;
  name: string;
  description: string | null;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  created_at: string;
  closes_at: string | null;
  image_url: string | null;
  updated_at: string;
  is_active: boolean;
  is_open: boolean;
  has_online_sessions: boolean;
  has_offline_sessions: boolean;
  online_sessions_count: number;
  offline_sessions_count: number;
  participants_count: number;
  is_private: boolean;
  files_count: number;
  files: EventFile[];
  online_sessions: OnlineSession[];
  offline_sessions: OfflineSession[];
  participants: Participant[];
  // Добавляем информацию о текущем пользователе
  current_user_participation?: {
    id: number;
    role: string;
    is_confirmed: boolean;
    registered_at: string;
  };
}

interface RegistrationForm {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // Состояния
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'online' | 'offline' | 'files'>('overview');
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationError, setRegistrationError] = useState<string>('');
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  
  // Состояния для работы с файлами
  const [files, setFiles] = useState<DisplayFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileForm, setFileForm] = useState<FileUploadForm>({
    name: '',
    description: '',
    category: 'document',
    is_public: true,
    file: null
  });
  
  // Категории файлов
  const fileCategories: FileCategory[] = [
    { value: 'image', label: 'Изображение' },
    { value: 'document', label: 'Документ' },
    { value: 'video', label: 'Видео' },
    { value: 'audio', label: 'Аудио' },
    { value: 'archive', label: 'Архив' },
    { value: 'other', label: 'Другое' }
  ];

  // Загрузка данных события
  const loadEventDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await apiClient.get<Event>(`/api/v1/events/${id}/`);
      setEvent(response);
      
      // Преобразуем файлы события в формат для отображения
      if (response.files && response.files.length > 0) {
        const displayFiles: DisplayFile[] = response.files.map((file) => ({
          id: file.id,
          name: file.description || file.file_name,
          original_name: file.file_name,
          file_url: file.file_url,
          category: file.category,
          file_size: file.file_size,
          file_size_display: file.file_size_display,
          description: file.description,
          is_public: file.is_public,
          uploaded_by: response.owner,
          uploaded_at: file.uploaded_at,
          download_count: 0,
          mime_type: getMimeTypeFromFileName(file.file_name)
        }));
        setFiles(displayFiles);
      }
      
      // Если пользователь авторизован, предзаполняем форму и проверяем участие
      if (user) {
        setRegistrationForm(prev => ({
          ...prev,
          name: user.full_name || '',
          email: user.email || ''
        }));
        
        // Проверяем, участвует ли пользователь в событии
        checkUserParticipation(response);
      }
      
    } catch (err: any) {
      console.error('Ошибка загрузки деталей события:', err);
      setError(err.message || 'Не удалось загрузить информацию о событии');
    } finally {
      setLoading(false);
    }
  };

  // Получение MIME типа по имени файла
  const getMimeTypeFromFileName = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      
      // Archives
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      
      // Other
      'json': 'application/json',
      'xml': 'application/xml',
      'yaml': 'application/x-yaml',
      'yml': 'application/x-yaml'
    };
    
    return mimeTypes[extension || ''] || 'application/octet-stream';
  };

  // Проверка участия пользователя в событии
  const checkUserParticipation = (eventData: Event) => {
    if (!user || !isAuthenticated) return;
    
    // Ищем участника с текущим ID пользователя
    const userParticipation = eventData.participants.find(
      participant => participant.user.id === user.id
    );
    
    // Если нашли, обновляем событие с информацией о текущем пользователе
    if (userParticipation) {
      setEvent(prev => prev ? {
        ...prev,
        current_user_participation: {
          id: userParticipation.id,
          role: userParticipation.role,
          is_confirmed: userParticipation.is_confirmed,
          registered_at: userParticipation.registered_at
        }
      } : null);
    }
  };

  // Загрузка файлов события (резервный вариант)
  const loadEventFiles = async () => {
    if (!id || !user) return;
    
    setFilesLoading(true);
    try {
      // Пытаемся загрузить файлы через отдельный endpoint
      const response = await apiClient.get<DisplayFile[]>(`/api/v1/files/?event=${id}`);
      setFiles(response);
    } catch (err: any) {
      console.error('Ошибка загрузки файлов события:', err);
      // Если не удалось загрузить отдельно, используем файлы из события
      if (event?.files && event.files.length > 0) {
        const displayFiles: DisplayFile[] = event.files.map((file) => ({
          id: file.id,
          name: file.description || file.file_name,
          original_name: file.file_name,
          file_url: file.file_url,
          category: file.category,
          file_size: file.file_size,
          file_size_display: file.file_size_display,
          description: file.description,
          is_public: file.is_public,
          uploaded_by: event.owner,
          uploaded_at: file.uploaded_at,
          download_count: 0,
          mime_type: getMimeTypeFromFileName(file.file_name)
        }));
        setFiles(displayFiles);
      }
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    loadEventDetails();
  }, [id]);

  // Обработчики
  const handleBack = () => {
    navigate('/user/events');
  };

  const handleRegistration = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }
    
    if (!event?.is_open) {
      setError('Регистрация на это событие закрыта');
      return;
    }
    
    setShowRegistrationForm(true);
  };

  const handleConfirmRegistration = async () => {
    if (!event || !isAuthenticated) return;
    
    setRegistrationLoading(true);
    setRegistrationError('');
    
    try {
      // Используем ваш API endpoint для регистрации
      const response = await apiClient.post(`/api/v1/events/${event.id}/join/`, {
        notes: registrationForm.notes || '',
        phone: registrationForm.phone || ''
      });
      
      setRegistrationSuccess(true);
      
      // Обновляем данные события
      setTimeout(() => {
        loadEventDetails();
        setShowRegistrationForm(false);
        setRegistrationSuccess(false);
      }, 2000);
      
    } catch (err: any) {
      console.error('Ошибка регистрации:', err);
      
      // Проверяем разные возможные ошибки
      if (err.response?.status === 400) {
        const errorData = err.response.data;
        if (errorData.user && errorData.user[0] === 'Этот пользователь уже участвует в данном событии') {
          setRegistrationError('Вы уже зарегистрированы на это событие');
          // Если уже зарегистрирован, обновляем данные
          setTimeout(() => {
            loadEventDetails();
            setShowRegistrationForm(false);
          }, 1500);
        } else {
          setRegistrationError(errorData.detail || 'Ошибка при регистрации');
        }
      } else {
        setRegistrationError(err.message || 'Не удалось зарегистрироваться на событие');
      }
    } finally {
      setRegistrationLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!event?.current_user_participation) return;
    
    if (!window.confirm('Вы уверены, что хотите отменить регистрацию на это событие?')) {
      return;
    }
    
    try {
      // Используем ваш API endpoint для отмены регистрации
      await apiClient.post(`/api/v1/events/${event.id}/leave/`);
      
      // Обновляем данные события
      loadEventDetails();
      
    } catch (err: any) {
      console.error('Ошибка отмены регистрации:', err);
      setError(err.message || 'Не удалось отменить регистрацию');
    }
  };

  const handleFormChange = (field: keyof RegistrationForm, value: string) => {
    setRegistrationForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Обработчики для файлов
  const handleUploadFile = () => {
    if (!isParticipant && !isOwner) {
      setError('Только участники могут загружать файлы');
      return;
    }
    setShowUploadModal(true);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFileForm(prev => ({
        ...prev,
        file,
        name: prev.name || file.name.split('.')[0]
      }));
    }
  };

  const handleFileFormChange = (field: keyof FileUploadForm, value: any) => {
    setFileForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitFile = async () => {
    if (!fileForm.file || !event) {
      setUploadError('Выберите файл для загрузки');
      return;
    }
    
    setUploadLoading(true);
    setUploadError('');
    
    try {
      const formData = new FormData();
      formData.append('file', fileForm.file);
      formData.append('name', fileForm.name);
      
      if (fileForm.description) {
        formData.append('description', fileForm.description);
      }
      
      formData.append('category', fileForm.category);
      formData.append('is_public', fileForm.is_public.toString());
      
      // КЛЮЧЕВОЙ МОМЕНТ: Добавляем ID события для автоматической привязки
      formData.append('event_id', event.id.toString());
      formData.append('event_category', fileForm.category);
      formData.append('event_description', fileForm.description || '');
      
      console.log('Загрузка файла с привязкой к событию:', event.id);
      
      // Используем endpoint для загрузки файлов
      const response = await apiClient.post('/api/v1/files/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Файл загружен и привязан:', response);
      
      setUploadSuccess(true);
      setFileForm({
        name: '',
        description: '',
        category: 'document',
        is_public: true,
        file: null
      });
      
      // Обновляем список файлов
      setTimeout(() => {
        loadEventFiles();
        setUploadSuccess(false);
        setShowUploadModal(false);
      }, 1500);
      
    } catch (err: any) {
      console.error('Ошибка загрузки файла:', err);
      setUploadError(err.message || 'Не удалось загрузить файл');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот файл?')) {
      return;
    }
    
    try {
      await apiClient.delete(`/api/v1/files/${fileId}/`);
      
      // Обновляем список файлов
      setFiles(prev => prev.filter(file => file.id !== fileId));
      
    } catch (err: any) {
      console.error('Ошибка удаления файла:', err);
      setError(err.message || 'Не удалось удалить файл');
    }
  };

  const handleDownloadFile = async (file: DisplayFile) => {
    try {
      const response = await fetch(file.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Обновляем счетчик загрузок (если есть такой endpoint)
      try {
        await apiClient.post(`/api/v1/files/${file.id}/download/`);
      } catch (err) {
        console.log('Не удалось обновить счетчик загрузок:', err);
      }
      
    } catch (err: any) {
      console.error('Ошибка скачивания файла:', err);
      setError(err.message || 'Не удалось скачать файл');
    }
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <DocumentIcon className="h-8 w-8 text-purple-600" />;
      case 'document':
        return <DocumentTextIcon className="h-8 w-8 text-blue-600" />;
      case 'video':
        return <VideoCameraIcon className="h-8 w-8 text-red-600" />;
      case 'audio':
        return <BellAlertIcon className="h-8 w-8 text-green-600" />;
      case 'archive':
        return <FolderIcon className="h-8 w-8 text-yellow-600" />;
      default:
        return <DocumentIcon className="h-8 w-8 text-gray-600" />;
    }
  };

  // Проверка, являюсь ли я участником
  const isParticipant = !!event?.current_user_participation;
  const isConfirmed = event?.current_user_participation?.is_confirmed;
  const isOwner = event?.owner.id === user?.id;

  // Проверка прав на загрузку файлов
  const canUploadFiles = (isParticipant && isConfirmed) || isOwner;

  // Форматирование
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не указана';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatRelativeDate = (dateString: string | null) => {
    if (!dateString) return 'Не указана';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffDays > 7) {
        return formatDate(dateString);
      } else if (diffDays > 0) {
        return `${diffDays} дней назад`;
      } else if (diffHours > 0) {
        return `${diffHours} часов назад`;
      } else if (diffMinutes > 0) {
        return `${diffMinutes} минут назад`;
      } else {
        return 'Только что';
      }
    } catch {
      return dateString;
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'Не указано';
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours} ч ${remainingMinutes} мин` 
      : `${hours} ч`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
      case 'scheduled':
      case 'ongoing':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return 'Опубликовано';
      case 'draft': return 'Черновик';
      case 'cancelled': return 'Отменено';
      case 'completed': return 'Завершено';
      case 'scheduled': return 'Запланировано';
      case 'ongoing': return 'В процессе';
      case 'completed': return 'Завершено';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  };

  // Проверка возможности регистрации
  const canRegister = !isOwner && 
                     event?.is_open && 
                     event?.status === 'published' && 
                     event?.is_active &&
                     !isParticipant;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Загрузка информации о событии...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBack}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Назад к событиям
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">
            {error || 'Событие не найдено'}
          </h3>
          <button
            onClick={handleBack}
            className="mt-4 inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Вернуться к событиям
          </button>
        </div>
      </div>
    );
  }

  // Фильтруем активные сессии
  const activeOnlineSessions = event.online_sessions.filter(s => s.is_active);
  const activeOfflineSessions = event.offline_sessions.filter(s => s.is_active);
  
  // Сортируем сессии по времени начала
  const sortedOnlineSessions = [...activeOnlineSessions].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  
  const sortedOfflineSessions = [...activeOfflineSessions].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Хедер */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between py-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Назад
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
                  <p className="text-gray-600 mt-1">
                    Организатор: {event.owner.full_name}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0 flex space-x-3">
              {isOwner ? (
                <div className="flex items-center bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Вы организатор
                </div>
              ) : isParticipant ? (
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center px-4 py-2 rounded-lg ${
                    isConfirmed ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    {isConfirmed ? 'Вы участвуете' : 'Ожидает подтверждения'}
                  </div>
                  <button
                    onClick={handleCancelRegistration}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Отменить участие
                  </button>
                </div>
              ) : canRegister ? (
                <button
                  onClick={handleRegistration}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <ArrowRightCircleIcon className="h-5 w-5 mr-2" />
                  Принять участие
                </button>
              ) : (
                <div className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">
                  <XCircleIcon className="h-5 w-5 mr-2" />
                  {event.is_open ? 'Регистрация закрыта' : 'Регистрация недоступна'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно регистрации */}
      {showRegistrationForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Регистрация на событие
              </h3>
              <p className="text-sm text-gray-500 mt-1">{event.name}</p>
            </div>
            
            <div className="px-6 py-4">
              {registrationSuccess ? (
                <div className="text-center py-6">
                  <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Регистрация успешно отправлена!
                  </h4>
                  <p className="text-gray-600">
                    {event.is_private 
                      ? 'Ваша заявка отправлена организатору на рассмотрение.' 
                      : 'Вы успешно зарегистрировались на событие.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ваше имя
                    </label>
                    <input
                      type="text"
                      value={registrationForm.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Введите ваше имя"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={registrationForm.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Введите ваш email"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Телефон (опционально)
                    </label>
                    <input
                      type="tel"
                      value={registrationForm.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+7 (999) 999-99-99"
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Комментарий (опционально)
                    </label>
                    <textarea
                      value={registrationForm.notes}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Дополнительная информация для организатора"
                      rows={3}
                    />
                  </div>
                  
                  {registrationError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{registrationError}</p>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-500 mb-4">
                    <p>После регистрации организатор {event.owner.full_name} получит уведомление о вашей заявке.</p>
                    {event.is_private && (
                      <p className="mt-2 text-yellow-600">
                        Это приватное событие. Ваша заявка будет рассмотрена организатором.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
              {!registrationSuccess && (
                <>
                  <button
                    onClick={() => setShowRegistrationForm(false)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={registrationLoading}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleConfirmRegistration}
                    disabled={registrationLoading || !registrationForm.name || !registrationForm.email}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registrationLoading ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Отправка...
                      </span>
                    ) : (
                      'Отправить заявку'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно загрузки файла */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Загрузка файла
                </h3>
                <p className="text-sm text-gray-500 mt-1">{event.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError('');
                  setUploadSuccess(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="px-6 py-4">
              {uploadSuccess ? (
                <div className="text-center py-6">
                  <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Файл успешно загружен!
                  </h4>
                  <p className="text-gray-600">
                    Ваш файл был загружен и будет доступен другим участникам.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Файл *
                    </label>
                    <div className="mt-1 flex items-center">
                      <label className="w-full flex flex-col items-center px-4 py-6 bg-white text-blue rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50">
                        <CloudArrowUpIcon className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">
                          {fileForm.file 
                            ? fileForm.file.name 
                            : 'Нажмите для выбора файла'}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileInputChange}
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название файла *
                    </label>
                    <input
                      type="text"
                      value={fileForm.name}
                      onChange={(e) => handleFileFormChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Введите название файла"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Категория
                    </label>
                    <select
                      value={fileForm.category}
                      onChange={(e) => handleFileFormChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {fileCategories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Описание (опционально)
                    </label>
                    <textarea
                      value={fileForm.description}
                      onChange={(e) => handleFileFormChange('description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Описание файла"
                      rows={3}
                    />
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_public"
                        checked={fileForm.is_public}
                        onChange={(e) => handleFileFormChange('is_public', e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700">
                        Сделать файл публичным (доступен всем участникам)
                      </label>
                    </div>
                  </div>
                  
                  {uploadError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{uploadError}</p>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-500 mb-4">
                    <p>Максимальный размер файла: 100 MB</p>
                    <p>Допустимые форматы: JPG, PNG, PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP, RAR, MP4, MP3, TXT</p>
                  </div>
                </>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
              {!uploadSuccess && (
                <>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadError('');
                      setFileForm({
                        name: '',
                        description: '',
                        category: 'document',
                        is_public: true,
                        file: null
                      });
                    }}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={uploadLoading}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSubmitFile}
                    disabled={uploadLoading || !fileForm.file || !fileForm.name.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadLoading ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Загрузка...
                      </span>
                    ) : (
                      'Загрузить файл'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Основная информация */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">О событии</h2>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(event.status)}`}>
                    {getStatusText(event.status)}
                  </span>
                  {event.is_private && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      Приватное
                    </span>
                  )}
                  {isOwner && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      Организатор
                    </span>
                  )}
                </div>
              </div>
              
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap mb-6">
                  {event.description || 'Описание отсутствует'}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Дата создания
                      </h3>
                      <p className="text-gray-900">{formatDate(event.created_at)}</p>
                    </div>
                    
                    {event.closes_at && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                          <ClockIcon className="h-4 w-4 mr-2" />
                          Регистрация до
                        </h3>
                        <p className="text-gray-900">{formatDate(event.closes_at)}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {isParticipant && event.current_user_participation && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Ваше участие
                        </h3>
                        <div className="flex items-center">
                          <CheckCircleIcon className={`h-5 w-5 mr-2 ${isConfirmed ? 'text-green-500' : 'text-yellow-500'}`} />
                          <div>
                            <p className="text-gray-900 font-medium">
                              {isConfirmed ? 'Подтверждено' : 'Ожидает подтверждения'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Зарегистрировались {formatRelativeDate(event.current_user_participation.registered_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Участников
                      </h3>
                      <div className="flex items-center">
                        <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <p className="text-gray-900 font-semibold">{event.participants_count}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Файлов загружено
                      </h3>
                      <div className="flex items-center">
                        <DocumentIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <p className="text-gray-900 font-semibold">{files.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Табы для сессий и файлов */}
            <div className="mt-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'overview'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Обзор сессий
                  </button>
                  
                  {sortedOnlineSessions.length > 0 && (
                    <button
                      onClick={() => setActiveTab('online')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                        activeTab === 'online'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Онлайн-сессии ({sortedOnlineSessions.length})
                    </button>
                  )}
                  
                  {sortedOfflineSessions.length > 0 && (
                    <button
                      onClick={() => setActiveTab('offline')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                        activeTab === 'offline'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Офлайн-сессии ({sortedOfflineSessions.length})
                    </button>
                  )}
                  
                  <button
                    onClick={() => setActiveTab('files')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'files'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Файлы и проекты ({files.length})
                  </button>
                </nav>
              </div>

              {/* Контент табов */}
              <div className="mt-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Онлайн сессии */}
                    {sortedOnlineSessions.length > 0 && (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <VideoCameraIcon className="h-5 w-5 mr-2 text-purple-600" />
                            Онлайн-сессии
                          </h3>
                          <span className="text-sm text-gray-500">
                            {sortedOnlineSessions.length} сессий
                          </span>
                        </div>
                        
                        <div className="space-y-4">
                          {sortedOnlineSessions.slice(0, 3).map(session => (
                            <div 
                              key={session.id} 
                              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{session.session_name}</h4>
                                  {session.session_notes && (
                                    <p className="text-sm text-gray-600 mt-1">{session.session_notes}</p>
                                  )}
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${getStatusColor(session.status)}`}>
                                  {getStatusText(session.status)}
                                </span>
                              </div>
                              
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center text-gray-600">
                                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{formatDate(session.start_time)}</span>
                                </div>
                                
                                {session.duration_minutes && (
                                  <div className="text-gray-600">
                                    Длительность: {formatDuration(session.duration_minutes)}
                                  </div>
                                )}
                                
                                {session.link && (isParticipant || isOwner) && (
                                  <div className="md:col-span-2">
                                    <a 
                                      href={session.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-blue-600 hover:text-blue-800"
                                    >
                                      <LinkIcon className="h-4 w-4 mr-2" />
                                      Ссылка для подключения
                                    </a>
                                  </div>
                                )}
                                
                                {session.link && !isParticipant && !isOwner && (
                                  <div className="md:col-span-2">
                                    <div className="flex items-center text-gray-500">
                                      <BellAlertIcon className="h-4 w-4 mr-2" />
                                      <span>Ссылка доступна после регистрации</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {sortedOnlineSessions.length > 3 && (
                            <div className="text-center pt-4">
                              <button
                                onClick={() => setActiveTab('online')}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Показать все {sortedOnlineSessions.length} онлайн-сессий
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Офлайн сессии */}
                    {sortedOfflineSessions.length > 0 && (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <MapPinIcon className="h-5 w-5 mr-2 text-yellow-600" />
                            Офлайн-сессии
                          </h3>
                          <span className="text-sm text-gray-500">
                            {sortedOfflineSessions.length} сессий
                          </span>
                        </div>
                        
                        <div className="space-y-4">
                          {sortedOfflineSessions.slice(0, 3).map(session => (
                            <div 
                              key={session.id} 
                              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{session.session_name}</h4>
                                  {session.session_notes && (
                                    <p className="text-sm text-gray-600 mt-1">{session.session_notes}</p>
                                  )}
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${getStatusColor(session.status)}`}>
                                  {getStatusText(session.status)}
                                </span>
                              </div>
                              
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center text-gray-600">
                                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{formatDate(session.start_time)}</span>
                                </div>
                                
                                {session.duration_minutes && (
                                  <div className="text-gray-600">
                                    Длительность: {formatDuration(session.duration_minutes)}
                                  </div>
                                )}
                                
                                {session.full_location && (
                                  <div className="md:col-span-2">
                                    <div className="flex items-start text-gray-600">
                                      <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 text-gray-400" />
                                      <span>{session.full_location}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {sortedOfflineSessions.length > 3 && (
                            <div className="text-center pt-4">
                              <button
                                onClick={() => setActiveTab('offline')}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Показать все {sortedOfflineSessions.length} офлайн-сессий
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'online' && sortedOnlineSessions.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Все онлайн-сессии</h3>
                      <span className="text-sm text-gray-500">
                        {sortedOnlineSessions.length} сессий
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {sortedOnlineSessions.map(session => (
                        <div 
                          key={session.id} 
                          className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-lg">{session.session_name}</h4>
                              {session.session_notes && (
                                <p className="text-gray-600 mt-2">{session.session_notes}</p>
                              )}
                            </div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ml-3 ${getStatusColor(session.status)}`}>
                              {getStatusText(session.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">Начало</div>
                              <div className="flex items-center text-gray-900">
                                <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                                {formatDate(session.start_time)}
                              </div>
                            </div>
                            
                            {session.end_time && (
                              <div>
                                <div className="text-sm font-medium text-gray-500 mb-1">Окончание</div>
                                <div className="flex items-center text-gray-900">
                                  <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                                  {formatDate(session.end_time)}
                                </div>
                              </div>
                            )}
                            
                            {session.duration_minutes && (
                              <div>
                                <div className="text-sm font-medium text-gray-500 mb-1">Длительность</div>
                                <div className="text-gray-900">{formatDuration(session.duration_minutes)}</div>
                              </div>
                            )}
                            
                            {session.link && (isParticipant || isOwner) && (
                              <div className="md:col-span-2">
                                <div className="text-sm font-medium text-gray-500 mb-2">Ссылка для подключения</div>
                                <a 
                                  href={session.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                                >
                                  <LinkIcon className="h-5 w-5 mr-2" />
                                  Присоединиться к сессии
                                </a>
                              </div>
                            )}
                            
                            {session.link && !isParticipant && !isOwner && (
                              <div className="md:col-span-2">
                                <div className="text-sm font-medium text-gray-500 mb-2">Ссылка для подключения</div>
                                <div className="flex items-center p-3 bg-gray-50 text-gray-600 rounded-lg">
                                  <BellAlertIcon className="h-5 w-5 mr-3 text-gray-400" />
                                  <span>Для получения ссылки необходимо зарегистрироваться на событие</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'offline' && sortedOfflineSessions.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Все офлайн-сессии</h3>
                      <span className="text-sm text-gray-500">
                        {sortedOfflineSessions.length} сессий
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {sortedOfflineSessions.map(session => (
                        <div 
                          key={session.id} 
                          className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-lg">{session.session_name}</h4>
                              {session.session_notes && (
                                <p className="text-gray-600 mt-2">{session.session_notes}</p>
                              )}
                            </div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ml-3 ${getStatusColor(session.status)}`}>
                              {getStatusText(session.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <div className="text-sm font-medium text-gray-500 mb-1">Начало</div>
                              <div className="flex items-center text-gray-900">
                                <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                                {formatDate(session.start_time)}
                              </div>
                            </div>
                            
                            {session.end_time && (
                              <div>
                                <div className="text-sm font-medium text-gray-500 mb-1">Окончание</div>
                                <div className="flex items-center text-gray-900">
                                  <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                                  {formatDate(session.end_time)}
                                </div>
                              </div>
                            )}
                            
                            {session.duration_minutes && (
                              <div>
                                <div className="text-sm font-medium text-gray-500 mb-1">Длительность</div>
                                <div className="text-gray-900">{formatDuration(session.duration_minutes)}</div>
                              </div>
                            )}
                            
                            {session.full_location && (
                              <div className="md:col-span-2">
                                <div className="text-sm font-medium text-gray-500 mb-2">Место проведения</div>
                                <div className="flex items-start">
                                  <MapPinIcon className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                                  <div>
                                    <div className="text-gray-900 font-medium">{session.full_location}</div>
                                    {session.room && (
                                      <div className="text-sm text-gray-600 mt-1 flex items-center">
                                        <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                                        Аудитория: {session.room}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'files' && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Файлы и проекты</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Файлы, загруженные участниками и организаторами
                        </p>
                      </div>
                      
                      {canUploadFiles && (
                        <button
                          onClick={handleUploadFile}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                          Загрузить файл
                        </button>
                      )}
                    </div>
                    
                    {filesLoading ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Загрузка файлов...</p>
                      </div>
                    ) : files.length > 0 ? (
                      <div className="space-y-4">
                        {files.map(file => {
                          const isFileOwner = file.uploaded_by.id === user?.id;
                          
                          return (
                            <div 
                              key={file.id} 
                              className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start">
                                  <div className="flex-shrink-0 mr-4">
                                    {getFileIcon(file.category)}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 text-lg">{file.name}</h4>
                                    {file.description && (
                                      <p className="text-gray-600 mt-1">{file.description}</p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                                      <span className="inline-flex items-center">
                                        <UserIcon className="h-3 w-3 mr-1" />
                                        {file.uploaded_by.full_name || file.uploaded_by.email}
                                      </span>
                                      <span>{formatRelativeDate(file.uploaded_at)}</span>
                                      <span>{file.file_size_display}</span>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                                        file.is_public 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {file.is_public ? 'Публичный' : 'Приватный'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  {(isParticipant || isOwner || file.is_public) && (
                                    <button
                                      onClick={() => handleDownloadFile(file)}
                                      className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                                    >
                                      <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                                      Скачать
                                    </button>
                                  )}
                                  
                                  {(isFileOwner || isOwner) && (
                                    <button
                                      onClick={() => handleDeleteFile(file.id)}
                                      className="inline-flex items-center px-3 py-1 bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                          <FolderIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Файлы отсутствуют
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {canUploadFiles
                            ? 'Загрузите первый файл для этого события'
                            : 'Пока никто не загрузил файлы для этого события'}
                        </p>
                        
                        {canUploadFiles && (
                          <button
                            onClick={handleUploadFile}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                            Загрузить первый файл
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Боковая панель */}
          <div className="space-y-6">
            {/* Статус участия */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ваш статус</h3>
              
              {isOwner ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        Вы организатор
                      </div>
                      <div className="text-sm text-gray-500">
                        Вы управляете этим событием
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/admin/events/${event.id}`)}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Управление событием
                  </button>
                </div>
              ) : isParticipant ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        isConfirmed ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        <CheckCircleIcon className={`h-6 w-6 ${isConfirmed ? 'text-green-600' : 'text-yellow-600'}`} />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        Вы участвуете
                      </div>
                      <div className="text-sm text-gray-500">
                        {isConfirmed ? 'Подтверждено организатором' : 'Ожидает подтверждения'}
                      </div>
                      {event.current_user_participation && (
                        <div className="text-xs text-gray-400 mt-1">
                          Зарегистрировались {formatRelativeDate(event.current_user_participation.registered_at)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleCancelRegistration}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium"
                  >
                    Отменить участие
                  </button>
                </div>
              ) : canRegister ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserGroupIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        Вы не участвуете
                      </div>
                      <div className="text-sm text-gray-500">
                        Зарегистрируйтесь для участия
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleRegistration}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    <ArrowRightCircleIcon className="h-5 w-5 mr-2" />
                    Принять участие
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-600">
                  <XCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p>Регистрация на это событие недоступна</p>
                </div>
              )}
            </div>

            {/* Быстрые действия */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Действия</h3>
              <div className="space-y-3">
                {canRegister && (
                  <button
                    onClick={handleRegistration}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    <ArrowRightCircleIcon className="h-5 w-5 mr-2" />
                    Принять участие
                  </button>
                )}
                
                {canUploadFiles && (
                  <button
                    onClick={handleUploadFile}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                    Загрузить проект
                  </button>
                )}
                
                {(event.has_online_sessions && sortedOnlineSessions.length > 0) && (
                  <button
                    onClick={() => setActiveTab('online')}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium"
                  >
                    <VideoCameraIcon className="h-5 w-5 mr-2" />
                    Онлайн-сессии
                  </button>
                )}
                
                {(event.has_offline_sessions && sortedOfflineSessions.length > 0) && (
                  <button
                    onClick={() => setActiveTab('offline')}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 font-medium"
                  >
                    <MapPinIcon className="h-5 w-5 mr-2" />
                    Офлайн-сессии
                  </button>
                )}
                
                <button
                  onClick={() => setActiveTab('files')}
                  className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  <DocumentIcon className="h-5 w-5 mr-2" />
                  Файлы и проекты
                </button>
                
                {isOwner && (
                  <button
                    onClick={() => navigate(`/admin/events/${event.id}`)}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    Управление событием
                  </button>
                )}
              </div>
            </div>

            {/* Организатор */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Организатор</h3>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  {event.owner.avatar_url ? (
                    <img 
                      src={event.owner.avatar_url} 
                      alt={event.owner.full_name || 'Организатор'}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {event.owner.full_name}
                  </div>
                  <div className="text-sm text-gray-500">{event.owner.email}</div>
                </div>
              </div>
              
              {/* Контакты (только для участников и организатора) */}
              {(isParticipant || isOwner) && event.owner.email && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-sm font-medium text-gray-700 mb-2">Контакты организатора</div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <a 
                        href={`mailto:${event.owner.email}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {event.owner.email}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Быстрая статистика */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-600">Участников</span>
                  </div>
                  <span className="font-bold text-gray-900">{event.participants_count}</span>
                </div>
                
                {event.has_online_sessions && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <VideoCameraIcon className="h-5 w-5 text-purple-400 mr-3" />
                      <span className="text-gray-600">Онлайн-сессий</span>
                    </div>
                    <span className="font-bold text-gray-900">{event.online_sessions_count}</span>
                  </div>
                )}
                
                {event.has_offline_sessions && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MapPinIcon className="h-5 w-5 text-yellow-400 mr-3" />
                      <span className="text-gray-600">Офлайн-сессий</span>
                    </div>
                    <span className="font-bold text-gray-900">{event.offline_sessions_count}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DocumentIcon className="h-5 w-5 text-blue-400 mr-3" />
                    <span className="text-gray-600">Файлов</span>
                  </div>
                  <span className="font-bold text-gray-900">{files.length}</span>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 mb-2">Статус события</div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(event.status)}`}>
                      {getStatusText(event.status)}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      event.is_open 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {event.is_open ? 'Регистрация открыта' : 'Регистрация закрыта'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};