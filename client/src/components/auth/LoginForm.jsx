import { useAuth } from '../../context/AuthContext';
import AuthForm from './AuthForm';

export default function LoginForm() {
  const { login, loading, error, clearError } = useAuth();
  return (
    <AuthForm
      mode="login"
      onSubmit={(email, password) => login(email, password)}
      loading={loading}
      error={error}
      clearError={clearError}
    />
  );
}
