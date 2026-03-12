import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '../../types';
import { getSession } from '../../utils/auth';

interface RequireAuthProps {
  requiredRole?: UserRole;
  children: JSX.Element;
}

export function RequireAuth({ requiredRole, children }: RequireAuthProps) {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location }}
      />
    );
  }

  if (requiredRole && session.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

