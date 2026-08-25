import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('MASTER' | 'ADMIN' | 'USER')[];
  allowRequirePasswordChange?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  allowRequirePasswordChange = false
}) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.requirePasswordChange && !allowRequirePasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Role not authorized, redirect to /chat (which is accessible by all roles)
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
};
