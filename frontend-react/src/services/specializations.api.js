import apiClient from './apiClient.js';

export const specializationsApi = {
  getSpecializations: async () => {
    const response = await apiClient.get('/specializations');
    const raw = response.data;
    const list = Array.isArray(raw?.data) ? raw.data : (raw?.data?.specializations || []);
    return {
      ...raw,
      data: {
        specializations: list,
      },
    };
  },
};

export default specializationsApi;
