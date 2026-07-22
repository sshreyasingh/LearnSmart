import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from './Feedback';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner size="lg" className="min-h-[60vh]" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
