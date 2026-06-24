import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/auth/LoginForm';
import OAuthButtons from '../components/auth/OAuthButtons';

export default function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-2">Welcome Back</h1>
      <p className="text-gray-500 text-center mb-8">Sign in to access your analysis dashboard</p>
      <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-8">
        <LoginForm />
        <OAuthButtons />
      </div>
    </div>
  );
}
