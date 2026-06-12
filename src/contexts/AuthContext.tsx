import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/capacitorConfig';
import { saveToken, loadToken, clearToken, loadTokenSync } from '../utils/secureStorage';

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
  // Khoi tao token dong bo (chi co gia tri tren web, null tren native)
  const [token, setToken] = useState<string | null>(loadTokenSync);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tren native (Android/iOS): doc token tu Capacitor Preferences bat dong bo
  useEffect(() => {
    const initToken = async () => {
      const stored = await loadToken();
      if (stored !== token) {
        setToken(stored);
      }
    };
    initToken();
  // Chi chay 1 lan khi mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Khi token thay doi: xac thuc voi server
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const backendUrl = getApiBaseUrl();
        const res = await fetch(`${backendUrl}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token khong hop le hoac het han
          await handleLogout();
        }
      } catch (err) {
        console.error('[Auth] Loi lay thong tin nguoi dung:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const backendUrl = getApiBaseUrl();
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dang nhap that bai.');
      await saveToken(data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Loi khong xac dinh';
      setError(msg);
      throw err;
    }
  };

  const register = async (email: string, password: string) => {
    setError(null);
    try {
      const backendUrl = getApiBaseUrl();
      const res = await fetch(`${backendUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dang ky that bai.');
      await saveToken(data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Loi khong xac dinh';
      setError(msg);
      throw err;
    }
  };

  const handleLogout = async () => {
    await clearToken();
    setToken(null);
    setUser(null);
  };

  const logout = () => {
    handleLogout();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phai duoc dung trong AuthProvider');
  }
  return context;
};
