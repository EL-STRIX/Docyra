import apiClient from './apiClient.js';

export const appointmentsApi = {
  bookAppointment: async (payload) => {
    const response = await apiClient.post('/appointments', payload);
    const raw = response.data;
    const appointment = raw?.data?.appointment || raw?.data;
    return {
      ...raw,
      data: {
        appointment,
      },
    };
  },
  getMyAppointments: async (params = {}) => {
    const response = await apiClient.get('/appointments/my', { params });
    const raw = response.data;
    const list = Array.isArray(raw?.data) ? raw.data : (raw?.data?.appointments || []);
    return {
      ...raw,
      data: {
        appointments: list,
      },
    };
  },
  getAppointmentById: async (id) => {
    const response = await apiClient.get(`/appointments/${id}`);
    const raw = response.data;
    const appointment = raw?.data?.appointment || raw?.data;
    return {
      ...raw,
      data: {
        appointment,
      },
    };
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
