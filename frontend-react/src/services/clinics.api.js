import apiClient from './apiClient.js';

export const clinicsApi = {
  getClinics: async (params = {}) => {
    const response = await apiClient.get('/clinics', { params });
    return response.data;
  },
  getClinicById: async (id) => {
    const response = await apiClient.get(`/clinics/${id}`);
    return response.data;
  },
};

export default clinicsApi;
