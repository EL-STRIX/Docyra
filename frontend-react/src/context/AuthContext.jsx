import { createContext, useState, useEffect, useCallback } from 'react';

import authApi from '../services/auth.api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load current user profile on app start (from cookie session)
  const refreshProfile = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      if (res.success && res.data.user) {
        // Patient Portal only allows patients
        if (res.data.user.role !== 'patient') {
          setUser(null);
          return;
        }
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();

    // Listen for unauthorized events emitted by apiClient interceptor
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('docyra:auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('docyra:auth:unauthorized', handleUnauthorized);
    };
  }, [refreshProfile]);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    if (res.success) {
      if (res.data.requires2FA) {
        if (res.data.user && res.data.user.role !== 'patient') {
          await logout();
          throw new Error('Access denied. Clinic Administrators, Doctors, and Platform Staff must log in through the Operations Portal (http://localhost:4200/login).');
        }
        return {
          requires2FA: true,
          tempToken: res.data.tempToken,
          user: res.data.user,
        };
      }
      if (res.data.user?.role && res.data.user.role !== 'patient') {
        await logout();
        throw new Error('Access denied. Clinic Administrators, Doctors, and Platform Staff must log in through the Operations Portal (http://localhost:4200/login).');
      }
      setUser(res.data.user);
      return { requires2FA: false, user: res.data.user };
    }
    return res;
  };

  const login2FA = async ({ tempToken, code }) => {
    const res = await authApi.login2FA({ tempToken, code });
    if (res.success && res.data.user) {
      if (res.data.user.role !== 'patient') {
        await logout();
        throw new Error('Access denied. Clinic Administrators, Doctors, and Platform Staff must log in through the Operations Portal (http://localhost:4200/login).');
      }
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.error?.message || '2FA login failed');
  };

  const register = async (data) => {
    const res = await authApi.register(data);
    return res;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    login2FA,
    register,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;

