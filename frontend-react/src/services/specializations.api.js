import apiClient from './apiClient.js';

export const specializationsApi = {
  getSpecializations: async () => {
    const response = await apiClient.get('/specializations');
    return response.data;
  },
};

export default specializationsApi;
