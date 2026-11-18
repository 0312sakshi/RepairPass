import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole = 'customer' }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <p>Verifying authentication session...</p>
      </div>
    );
  }

  if (!user) {
    // Redirect unauthenticated visitor to login, preserving attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (requiredRole && !roles.includes(user.role)) {
    return (
      <div className="container" style={{ padding: '60px 0' }}>
        <div className="alert alert-error">
          <h3>Access Denied</h3>
          <p>This section is restricted to {requiredRole} accounts only. Your current role is '{user.role}'.</p>
        </div>
      </div>
    );
  }

  return children;
}
