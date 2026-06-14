import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/utils/capacitorConfig';
import { saveToken, loadTokenSync } from '@/utils/secureStorage';
// import { loadToken, clearToken } from '@/utils/secureStorage';

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

// ============================================================
// AUTH TEMPORARILY DISABLED — fetch real token for default user
// ============================================================
const BYPASS_EMAIL = 'default@focustodo.local';
const BYPASS_USER: User = { id: 'default_user', email: BYPASS_EMAIL };

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    // base64url → base64 (JWT uses - and _ instead of + and /)
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    return typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000) + 60;
  } catch {
    return false;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const existingToken = loadTokenSync();
  // If token is still valid, use it immediately, no need to fetch again
  const [token, setToken] = useState<string | null>(isTokenValid(existingToken) ? existingToken : null);
  const [loading, setLoading] = useState(!isTokenValid(existingToken));
  const noop = async () => {};

  useEffect(() => {
    if (isTokenValid(loadTokenSync())) return; // token still valid
    const fetchBypassToken = async () => {
      try {
        const backendUrl = getApiBaseUrl();
        const res = await fetch(`${backendUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: BYPASS_EMAIL, password: '__dev__' }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            await saveToken(data.token);
            setToken(data.token);
          }
        }
      } catch {
        // backend not running — continue with localStorage data
      } finally {
        setLoading(false);
      }
    };
    fetchBypassToken();
  }, []);

  return (
    <AuthContext.Provider value={{
      user: BYPASS_USER,
      token,
      loading,
      login: noop,
      register: noop,
      logout: noop,
      error: null,
      setError: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );

  // ---- ORIGINAL LOGIN CODE (temporarily disabled) ----
  /*
  const [token, setToken] = useState<string | null>(loadTokenSync);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initToken = async () => {
      const stored = await loadToken();
      if (stored !== token) setToken(stored);
    };
    initToken();
  }, []);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const backendUrl = getApiBaseUrl();
        const res = await fetch(`${backendUrl}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          await handleLogout();
        }
      } catch (err) {
        console.error('[Auth] Error fetching user information:', err);
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
      if (!res.ok) throw new Error(data.error || 'Login failed.');
      await saveToken(data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
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
      if (!res.ok) throw new Error(data.error || 'Registration failed.');
      await saveToken(data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      throw err;
    }
  };

  const handleLogout = async () => {
    await clearToken();
    setToken(null);
    setUser(null);
  };

  const logout = () => { handleLogout(); };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
  */
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
