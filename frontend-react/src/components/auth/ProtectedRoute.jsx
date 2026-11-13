import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../context/useAuth.js';


export function ProtectedRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-neutral-text-secondary">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'patient') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
