import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

function InputField({ id, label, type, value, onChange, placeholder, required, autoComplete }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-surface-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="input-field pr-10"
        />
        {isPassword && value && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M15 12a3 3 0 01-3 3m0 0a3 3 0 01-3-3m9 0a9 9 0 00-9-9" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AuthForm({ mode, onSubmit, loading, error, clearError }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const submitting = useRef(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLocalError('');
    clearError();

    if (isRegister) {
      if (password.length < 8) { setLocalError('Password must be at least 8 characters'); submitting.current = false; return; }
      if (!/[A-Z]/.test(password)) { setLocalError('Password must contain an uppercase letter'); submitting.current = false; return; }
      if (!/[a-z]/.test(password)) { setLocalError('Password must contain a lowercase letter'); submitting.current = false; return; }
      if (!/[0-9]/.test(password)) { setLocalError('Password must contain a digit'); submitting.current = false; return; }
      try {
        await onSubmit(name, email, password);
      } catch (err) {
        setLocalError(err.response?.data?.message || 'Registration failed');
      }
    } else {
      try {
        await onSubmit(email, password);
      } catch (err) {
        setLocalError(err.response?.data?.message || 'Invalid email or password');
      }
    }
    submitting.current = false;
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {displayError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{displayError}</span>
        </div>
      )}

      {isRegister && (
        <InputField
          id="name"
          label="Full Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          required
          autoComplete="name"
        />
      )}

      <InputField
        id={isRegister ? 'reg-email' : 'email'}
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        autoComplete="email"
      />

      <InputField
        id={isRegister ? 'reg-password' : 'password'}
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={isRegister ? 'Min 8 chars, upper + lower + number' : '••••••••'}
        required
        autoComplete={isRegister ? 'new-password' : 'current-password'}
      />

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3 text-base"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {isRegister ? 'Creating account...' : 'Signing in...'}
          </span>
        ) : (
          isRegister ? 'Create Account' : 'Sign In'
        )}
      </button>

      <p className="text-center text-sm text-surface-400">
        {isRegister ? "Already have an account?" : "Don't have an account?"}{' '}
        <Link
          to={isRegister ? '/login' : '/register'}
          className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
        >
          {isRegister ? 'Sign in' : 'Create one'}
        </Link>
      </p>
    </form>
  );
}
