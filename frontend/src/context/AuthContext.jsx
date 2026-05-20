import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('vms_token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.setToken(token);
  }, [token]);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');

        if (active) {
          setUser(response.user);
        }
      } catch (_error) {
        localStorage.removeItem('vms_token');
        if (active) {
          setUser(null);
          setToken('');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [token]);

  async function login(credentials) {
    const response = await api.post('/auth/login', credentials);
    localStorage.setItem('vms_token', response.token);
    setToken(response.token);
    setUser(response.user);
  }

  async function register(payload) {
    const response = await api.post('/auth/register', payload);
    localStorage.setItem('vms_token', response.token);
    setToken(response.token);
    setUser(response.user);
  }

  function logout() {
    localStorage.removeItem('vms_token');
    setToken('');
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
