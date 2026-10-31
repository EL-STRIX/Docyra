import apiClient from './apiClient.js';

export const dependentsApi = {
  getDependents: async () => {
    const response = await apiClient.get('/dependents');
    const raw = response.data;
    const list = Array.isArray(raw?.data) ? raw.data : (raw?.data?.dependents || []);
    return {
      ...raw,
      data: {
        dependents: list,
      },
    };
  },
  createDependent: async (payload) => {
    const response = await apiClient.post('/dependents', payload);
    const raw = response.data;
    return {
      ...raw,
      data: {
        dependent: raw?.data?.dependent || raw?.data,
      },
    };
  },
  updateDependent: async (id, payload) => {
    const response = await apiClient.put(`/dependents/${id}`, payload);
    const raw = response.data;
    return {
      ...raw,
      data: {
        dependent: raw?.data?.dependent || raw?.data,
      },
    };
  },
  deleteDependent: async (id) => {
    const response = await apiClient.delete(`/dependents/${id}`);
    return response.data;
  },
};

export default dependentsApi;
