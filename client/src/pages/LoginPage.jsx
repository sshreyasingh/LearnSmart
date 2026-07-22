import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/auth/LoginForm';
import OAuthButtons from '../components/auth/OAuthButtons';
import { Spinner } from '../components/common/Feedback';

export default function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner size="lg" className="min-h-[60vh]" />;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-surface-900 mb-2">Welcome Back</h1>
          <p className="text-surface-500">Sign in to access your analysis dashboard</p>
        </div>
        <div className="card-elevated p-8">
          <LoginForm />
          <OAuthButtons />
        </div>
      </div>
    </div>
  );
}
