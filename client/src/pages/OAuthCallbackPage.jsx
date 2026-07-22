import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/common/Feedback';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const accessToken = searchParams.get('access');
    const refreshToken = searchParams.get('refresh');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('OAuth authentication was denied.');
      setTimeout(() => navigate('/login'), 2500);
      return;
    }

    if (accessToken && refreshToken && handleOAuthCallback) {
      handleOAuthCallback(accessToken, refreshToken)
        .then(() => navigate('/dashboard'))
        .catch(() => {
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/login'), 2500);
        });
    } else {
      setError('Invalid authentication response.');
      setTimeout(() => navigate('/login'), 2500);
    }
  }, [searchParams, navigate, handleOAuthCallback]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="card-elevated p-10 text-center max-w-sm w-full animate-fade-in-up">
        {error ? (
          <div>
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 font-semibold mb-2">{error}</p>
            <p className="text-surface-400 text-sm">Redirecting to login...</p>
          </div>
        ) : (
          <div>
            <Spinner size="lg" />
            <p className="text-surface-600 font-semibold mt-4">Completing authentication...</p>
            <p className="text-surface-400 text-sm mt-1">Please wait a moment</p>
          </div>
        )}
      </div>
    </div>
  );
}
