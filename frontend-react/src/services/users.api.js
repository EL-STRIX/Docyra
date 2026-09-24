import apiClient from './apiClient.js';

export const usersApi = {
  exportMyData: async () => {
    const response = await apiClient.get('/users/me/export');
    return response.data;
  },
  updateConsent: async (termsVersion) => {
    const response = await apiClient.patch('/users/me/consent', { termsVersion });
    return response.data;
  },
  updateProfile: async (payload) => {
    const response = await apiClient.patch('/users/me/profile', payload);
    return response.data;
  },
};

export default usersApi;
