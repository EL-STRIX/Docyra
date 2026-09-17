import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from session
  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await apiClient.get('/auth/me');
        if (res.data?.user) {
          setUser(res.data.user);
        }
      } catch (err) {
        // If 401, user is unauthenticated
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    if (res.data?.requires2FA) {
      return { requires2FA: true, tempToken: res.data.tempToken, user: res.data.user };
    }
    if (res.data?.user) {
      setUser(res.data.user);
      if (res.data.accessToken) {
        localStorage.setItem('docyra_access_token', res.data.accessToken);
      }
    }
    return { requires2FA: false, user: res.data.user };
  };

  const verify2FA = async (token, tempToken) => {
    const res = await apiClient.post('/auth/2fa/verify', { token, tempToken });
    if (res.data?.user) {
      setUser(res.data.user);
      if (res.data.accessToken) {
        localStorage.setItem('docyra_access_token', res.data.accessToken);
      }
    }
    return res.data;
  };

  const register = async (userData) => {
    const res = await apiClient.post('/auth/register', userData);
    return res.data;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('docyra_access_token');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verify2FA,
        logout,
        refreshUser,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
