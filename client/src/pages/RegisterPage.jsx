import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RegisterForm from '../components/auth/RegisterForm';
import OAuthButtons from '../components/auth/OAuthButtons';
import { Spinner } from '../components/common/Feedback';

export default function RegisterPage() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner size="lg" className="min-h-[60vh]" />;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-surface-900 mb-2">Create Account</h1>
          <p className="text-surface-500">Start understanding any codebase in seconds</p>
        </div>
        <div className="card-elevated p-8">
          <RegisterForm />
          <OAuthButtons />
        </div>
      </div>
    </div>
  );
}
