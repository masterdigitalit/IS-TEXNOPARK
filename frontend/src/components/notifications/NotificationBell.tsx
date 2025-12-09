// src/components/notifications/NotificationBell.tsx - упрощенная версия
import React, { useState, useRef, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import NotificationDropdown from './NotificationDropdown';

interface NotificationBellProps {
  unreadCount: number;
  onNotificationsClick?: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ 
  unreadCount, 
  onNotificationsClick 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Закрытие dropdown при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
    onNotificationsClick?.();
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={handleBellClick}
        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg relative transition-colors"
        aria-label="Уведомления"
      >
        <BellIcon className="h-5 w-5" />
        
        {/* Badge для непрочитанных уведомлений */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[18px] min-h-[18px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown с уведомлениями */}
      {showDropdown && (
        <NotificationDropdown onClose={() => setShowDropdown(false)} />
      )}
    </div>
  );
};

export default NotificationBell;