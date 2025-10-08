import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthAdmin } from './AuthContextAdmin';

const ProtectedRouteAdmin = ({ allowedRoles }) => {
  const { user } = useAuthAdmin();

  console.log('ProtectedRouteAdmin: User state:', user);
  console.log('ProtectedRouteAdmin: Allowed roles:', allowedRoles);

  if (!user) {
    console.log('ProtectedRouteAdmin: User not found, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log('ProtectedRouteAdmin: User role not allowed, redirecting to /');
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRouteAdmin;