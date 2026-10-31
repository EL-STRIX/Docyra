import apiClient from './apiClient.js';

export const doctorsApi = {
  getDoctors: async (params = {}) => {
    const response = await apiClient.get('/doctors', { params });
    const raw = response.data;
    const list = Array.isArray(raw?.data) ? raw.data : (raw?.data?.doctors || []);
    return {
      ...raw,
      data: {
        ...(typeof raw?.data === 'object' && !Array.isArray(raw?.data) ? raw.data : {}),
        doctors: list,
      },
    };
  },
  getDoctorById: async (id) => {
    const response = await apiClient.get(`/doctors/${id}`);
    const raw = response.data;
    const doctorObj = raw?.data?.doctor || raw?.data;
    return {
      ...raw,
      data: {
        ...(typeof raw?.data === 'object' ? raw.data : {}),
        doctor: doctorObj,
      },
    };
  },
  getDoctorSlots: async (id, date) => {
    const response = await apiClient.get(`/doctors/${id}/slots`, {
      params: { date },
    });
    const raw = response.data;
    const slots = raw?.data?.slots || (Array.isArray(raw?.data) ? raw.data : []);
    return {
      ...raw,
      data: {
        ...(typeof raw?.data === 'object' ? raw.data : {}),
        slots,
      },
    };
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
