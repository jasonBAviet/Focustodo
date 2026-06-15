import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '@/utils/capacitorConfig';
import { saveToken, loadToken, clearToken, loadTokenSync } from '@/utils/secureStorage';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  setError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(loadTokenSync);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync stored token on mount (async path for native platforms)
  useEffect(() => {
    loadToken().then((stored) => {
      if (stored !== token) setToken(stored);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate token and fetch user whenever token changes
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          await handleLogout();
        }
      } catch {
        // Backend unreachable — keep existing session
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleLogout = useCallback(async () => {
    await clearToken();
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại.');
    await saveToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setError(null);
    const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Đăng ký thất bại.');
    await saveToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register,
      logout: handleLogout,
      error, setError,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
