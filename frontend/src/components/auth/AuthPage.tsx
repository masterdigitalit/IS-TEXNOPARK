// components/auth/AuthPage.tsx
import React, { useState } from 'react';
import {LoginForm} from './LoginForm';
import { RegisterForm } from './RegisterForm';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  const handleSuccess = () => {
    // Перенаправление после успешной аутентификации
    window.location.href = '/';
  };

  return (
    <div >
      {isLogin ? (
        <LoginForm
          onSuccess={handleSuccess}
          onSwitchToRegister={() => setIsLogin(false)}
        />
      ) : (
        <RegisterForm
          onSuccess={handleSuccess}
          onSwitchToLogin={() => setIsLogin(true)}
        />
      )}
    </div>
  );
};