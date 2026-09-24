import apiClient from './apiClient.js';

export const appointmentsApi = {
  bookAppointment: async (payload) => {
    const response = await apiClient.post('/appointments', payload);
    return response.data;
  },
  getMyAppointments: async (params = {}) => {
    const response = await apiClient.get('/appointments/my', { params });
    return response.data;
  },
  getAppointmentById: async (id) => {
    const response = await apiClient.get(`/appointments/${id}`);
    return response.data;
  },
  cancelAppointment: async (id, payload) => {
    const response = await apiClient.patch(`/appointments/${id}/cancel`, payload);
    return response.data;
  },
  getIcsCalendarUrl: (id) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${baseURL}/appointments/${id}/ics`;
  },
};

export default appointmentsApi;
