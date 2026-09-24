import apiClient from './apiClient.js';

export const dependentsApi = {
  getDependents: async () => {
    const response = await apiClient.get('/dependents');
    return response.data;
  },
  createDependent: async (payload) => {
    const response = await apiClient.post('/dependents', payload);
    return response.data;
  },
  updateDependent: async (id, payload) => {
    const response = await apiClient.put(`/dependents/${id}`, payload);
    return response.data;
  },
  deleteDependent: async (id) => {
    const response = await apiClient.delete(`/dependents/${id}`);
    return response.data;
  },
};

export default dependentsApi;
