import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { loginUser, registerUser, logoutUser, getMe, refreshToken } from '../api/auth.api';
import { setAccessToken, setRefreshToken, clearTokens, getAccessToken, getRefreshToken, decodeToken } from '../utils/storage';

const AuthContext = createContext(null);

const initialState = { user: null, loading: true, error: null };

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_LOADING':
      return { ...state, loading: true, error: null };
    case 'AUTH_SUCCESS':
      return { user: action.payload, loading: false, error: null };
    case 'AUTH_FAILURE':
      return { user: null, loading: false, error: action.payload };
    case 'LOGOUT':
      return { user: null, loading: false, error: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) dispatch({ type: 'AUTH_FAILURE', payload: null });
        return;
      }

      // Skip the doomed /auth/me call if the token is already expired
      const decoded = decodeToken(token);
      if (decoded && decoded.exp * 1000 <= Date.now()) {
        // Token expired — go straight to refresh
        const storedRefresh = getRefreshToken();
        if (!storedRefresh) {
          if (!cancelled) { clearTokens(); dispatch({ type: 'AUTH_FAILURE', payload: null }); }
          return;
        }

        try {
          const res = await refreshToken(storedRefresh);
          const { accessToken, refreshToken: newRefresh } = res.data.data;
          setAccessToken(accessToken);
          setRefreshToken(newRefresh);

          const me = await getMe();
          if (!cancelled) dispatch({ type: 'AUTH_SUCCESS', payload: me.data.data.user });
        } catch {
          if (!cancelled) { clearTokens(); dispatch({ type: 'AUTH_FAILURE', payload: null }); }
        }
        return;
      }

      try {
        const res = await getMe();
        if (!cancelled) dispatch({ type: 'AUTH_SUCCESS', payload: res.data.data.user });
        return;
      } catch {
        // Token expired server-side — try refresh
      }

      const storedRefresh = getRefreshToken();
      if (!storedRefresh) {
        if (!cancelled) { clearTokens(); dispatch({ type: 'AUTH_FAILURE', payload: null }); }
        return;
      }

      try {
        const res = await refreshToken(storedRefresh);
        const { accessToken, refreshToken: newRefresh } = res.data.data;
        setAccessToken(accessToken);
        setRefreshToken(newRefresh);

        const me = await getMe();
        if (!cancelled) dispatch({ type: 'AUTH_SUCCESS', payload: me.data.data.user });
      } catch {
        if (!cancelled) { clearTokens(); dispatch({ type: 'AUTH_FAILURE', payload: null }); }
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  const login = async (email, password) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const res = await loginUser({ email, password });
      const { user, accessToken, refreshToken: newRefresh } = res.data.data;
      setAccessToken(accessToken);
      setRefreshToken(newRefresh);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: msg });
      throw err;
    }
  };

  const register = async (name, email, password) => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const res = await registerUser({ name, email, password });
      const { user, accessToken, refreshToken: newRefresh } = res.data.data;
      setAccessToken(accessToken);
      setRefreshToken(newRefresh);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: msg });
      throw err;
    }
  };

  const logout = async () => {
    try { await logoutUser(); } catch {}
    clearTokens();
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  const handleOAuthCallback = useCallback(async (accessToken, refreshToken) => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const res = await getMe();
      dispatch({ type: 'AUTH_SUCCESS', payload: res.data.data.user });
    } catch {
      clearTokens();
      dispatch({ type: 'AUTH_FAILURE', payload: 'OAuth authentication failed' });
      throw new Error('OAuth authentication failed');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, clearError, handleOAuthCallback }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
