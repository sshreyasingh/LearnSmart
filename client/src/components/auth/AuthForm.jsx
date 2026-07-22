import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

function PasswordStrengthMeter({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Very Weak', color: 'bg-red-900/150', width: 'w-1/5', text: 'text-red-400' },
    { label: 'Weak', color: 'bg-orange-500', width: 'w-2/5', text: 'text-orange-600' },
    { label: 'Fair', color: 'bg-amber-900/150', width: 'w-3/5', text: 'text-amber-600' },
    { label: 'Good', color: 'bg-emerald-400', width: 'w-4/5', text: 'text-primary-500' },
    { label: 'Strong', color: 'bg-primary-500/100', width: 'w-full', text: 'text-primary-500' },
  ];

  const level = levels[Math.min(score, 4)];

  return (
    <div className="mt-2 animate-fade-in">
      <div className="flex gap-1 mb-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < score ? level.color : 'bg-surface-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-semibold ${level.text}`}>{level.label}</p>
    </div>
  );
}

function InputField({ id, label, type, value, onChange, placeholder, required, autoComplete, error }) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const hasValue = value?.length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        type={inputType}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`input-field peer pt-5 pb-2 ${isPassword ? 'pr-10' : ''} ${error ? 'error' : ''} ${hasValue || focused ? 'placeholder:opacity-0' : ''}`}
      />
      <label
        htmlFor={id}
        className={`absolute left-4 transition-all duration-200 pointer-events-none select-none
          ${hasValue || focused
            ? 'top-1.5 text-[10px] font-bold text-primary-400'
            : 'top-3 text-sm text-surface-400'
          }`}
      >
        {label}
      </label>
      {isPassword && value?.length > 0 && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors p-1"
          tabIndex={-1}
        >
          {showPassword ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M15 12a3 3 0 01-3 3m0 0a3 3 0 01-3-3m9 0a9 9 0 00-9-9" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

export default function AuthForm({ mode, onSubmit, loading, error, clearError }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const submitting = useRef(false);

  const isRegister = mode === 'register';

  const validate = () => {
    const errs = {};
    if (isRegister && !name.trim()) errs.name = 'Name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email';
    if (isRegister) {
      if (password.length < 8) errs.password = 'At least 8 characters';
      else if (!/[A-Z]/.test(password)) errs.password = 'Needs an uppercase letter';
      else if (!/[a-z]/.test(password)) errs.password = 'Needs a lowercase letter';
      else if (!/[0-9]/.test(password)) errs.password = 'Needs a digit';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLocalError('');
    clearError();

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      submitting.current = false;
      return;
    }
    setFieldErrors({});

    try {
      if (isRegister) {
        await onSubmit(name, email, password);
      } else {
        await onSubmit(email, password);
      }
    } catch (err) {
      setLocalError(err.response?.data?.message || (isRegister ? 'Registration failed' : 'Invalid email or password'));
    }
    submitting.current = false;
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {displayError && (
        <div className="alert-error">
          <svg className="w-5 h-5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{displayError}</span>
        </div>
      )}

      {isRegister && (
        <div>
          <InputField
            id="name"
            label="Full Name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: '' })); }}
            required
            autoComplete="name"
            error={fieldErrors.name}
          />
          {fieldErrors.name && <p className="text-xs text-red-400 font-medium mt-1 ml-1">{fieldErrors.name}</p>}
        </div>
      )}

      <div>
        <InputField
          id={isRegister ? 'reg-email' : 'email'}
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: '' })); }}
          required
          autoComplete="email"
          error={fieldErrors.email}
        />
        {fieldErrors.email && <p className="text-xs text-red-400 font-medium mt-1 ml-1">{fieldErrors.email}</p>}
      </div>

      <div>
        <InputField
          id={isRegister ? 'reg-password' : 'password'}
          label={isRegister ? 'Create password' : 'Password'}
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: '' })); }}
          required
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          error={fieldErrors.password}
        />
        {fieldErrors.password && <p className="text-xs text-red-400 font-medium mt-1 ml-1">{fieldErrors.password}</p>}
        {isRegister && !fieldErrors.password && <PasswordStrengthMeter password={password} />}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3.5 text-base mt-2"
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

      <p className="text-center text-sm text-surface-400 pt-2">
        {isRegister ? "Already have an account?" : "Don't have an account?"}{' '}
        <Link
          to={isRegister ? '/login' : '/register'}
          className="text-primary-400 hover:text-primary-400 font-semibold transition-colors underline-offset-2 hover:underline"
        >
          {isRegister ? 'Sign in' : 'Create one'}
        </Link>
      </p>
    </form>
  );
}
