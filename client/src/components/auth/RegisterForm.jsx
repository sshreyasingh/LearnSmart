import { useAuth } from '../../context/AuthContext';
import AuthForm from './AuthForm';

export default function RegisterForm() {
  const { register, loading, error, clearError } = useAuth();
  return (
    <AuthForm
      mode="register"
      onSubmit={(name, email, password) => register(name, email, password)}
      loading={loading}
      error={error}
      clearError={clearError}
    />
  );
}
