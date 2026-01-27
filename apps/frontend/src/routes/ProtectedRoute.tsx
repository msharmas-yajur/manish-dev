import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '@features/auth';

/**
 * ProtectedRoute component - Auth middleware wrapper
 * Checks if user is authenticated before allowing access to nested routes
 * Redirects to login page if not authenticated
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuthContext();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
