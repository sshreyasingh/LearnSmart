import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RegisterForm() {
  const { register, loading, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const submitting = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLocalError('');
    clearError();
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      submitting.current = false;
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setLocalError('Password must contain at least one uppercase letter');
      submitting.current = false;
      return;
    }
    if (!/[a-z]/.test(password)) {
      setLocalError('Password must contain at least one lowercase letter');
      submitting.current = false;
      return;
    }
    if (!/[0-9]/.test(password)) {
      setLocalError('Password must contain at least one digit');
      submitting.current = false;
      return;
    }
    try {
      await register(name, email, password);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Registration failed';
      setLocalError(msg);
    } finally {
      submitting.current = false;
    }
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {displayError && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {displayError}
        </div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-500 outline-none bg-gray-50/50 transition-all"
          placeholder="John Doe"
        />
      </div>
      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-500 outline-none bg-gray-50/50 transition-all"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="reg-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-500 outline-none bg-gray-50/50 transition-all"
          placeholder="Min 8 chars, upper + lower + number"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-2.5 rounded-xl hover:from-primary-700 hover:to-primary-800 font-medium shadow-md shadow-primary-500/20 disabled:opacity-50 disabled:shadow-none transition-all"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
      <p className="text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
