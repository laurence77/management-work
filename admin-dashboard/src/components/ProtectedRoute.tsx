import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
}

export const ProtectedRoute = ({ 
  children, 
  requiredPermission, 
  requiredRole 
}: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, hasPermission, hasRole } = useAuth();

  console.log('🛡️ PROTECTED ROUTE: Auth state -', { isAuthenticated, isLoading, requiredRole });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🛡️ PROTECTED ROUTE: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    console.log('🛡️ PROTECTED ROUTE: Permission denied for', requiredPermission);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Check role if required
  if (requiredRole && !hasRole(requiredRole)) {
    console.log('🛡️ PROTECTED ROUTE: Role denied for', requiredRole);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Your role doesn't have access to this page.</p>
        </div>
      </div>
    );
  }

  console.log('🛡️ PROTECTED ROUTE: All checks passed, rendering children');
  return <>{children}</>;
};