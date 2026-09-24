import apiClient from './apiClient.js';

export const authApi = {
  register: async (payload) => {
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },
  verifyEmail: async (token) => {
    const response = await apiClient.get('/auth/verify-email', {
      params: { token },
    });
    return response.data;
  },
  login: async (payload) => {
    const response = await apiClient.post('/auth/login', payload);
    return response.data;
  },
  login2FA: async (payload) => {
    const response = await apiClient.post('/auth/2fa/login', payload);
    return response.data;
  },
  setup2FA: async () => {
    const response = await apiClient.post('/auth/2fa/setup');
    return response.data;
  },
  verify2FA: async (payload) => {
    const response = await apiClient.post('/auth/2fa/verify', payload);
    return response.data;
  },
  disable2FA: async (payload) => {
    const response = await apiClient.post('/auth/2fa/disable', payload);
    return response.data;
  },
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
  forgotPassword: async (payload) => {
    const response = await apiClient.post('/auth/forgot-password', payload);
    return response.data;
  },
  resetPassword: async (payload) => {
    const response = await apiClient.post('/auth/reset-password', payload);
    return response.data;
  },
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export default authApi;
