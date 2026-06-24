import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    if (accessToken && refreshToken && handleOAuthCallback) {
      handleOAuthCallback(accessToken, refreshToken)
        .then(() => navigate('/dashboard'))
        .catch(() => {
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/login'), 2000);
        });
    } else {
      setError('Invalid authentication response.');
      setTimeout(() => navigate('/login'), 2000);
    }
  }, [searchParams, navigate, handleOAuthCallback]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Completing authentication...</p>
          </>
        )}
      </div>
    </div>
  );
}
