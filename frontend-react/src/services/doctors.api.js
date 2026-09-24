import apiClient from './apiClient.js';

export const doctorsApi = {
  getDoctors: async (params = {}) => {
    const response = await apiClient.get('/doctors', { params });
    return response.data;
  },
  getDoctorById: async (id) => {
    const response = await apiClient.get(`/doctors/${id}`);
    return response.data;
  },
  getDoctorSlots: async (id, date) => {
    const response = await apiClient.get(`/doctors/${id}/slots`, {
      params: { date },
    });
    return response.data;
  },
  applyDoctor: async (formData) => {
    const response = await apiClient.post('/doctors/apply', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default doctorsApi;
