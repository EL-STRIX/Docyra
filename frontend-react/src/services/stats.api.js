import apiClient from './apiClient.js';

export const statsApi = {
  getPublicStats: async () => {
    const response = await apiClient.get('/health/stats');
    return response.data;
  },
};

export default statsApi;

