import apiClient from './apiClient.js';

export const clinicsApi = {
  getClinics: async (params = {}) => {
    const response = await apiClient.get('/clinics', { params });
    const raw = response.data;
    const list = Array.isArray(raw?.data) ? raw.data : (raw?.data?.clinics || []);
    return {
      ...raw,
      data: {
        ...(typeof raw?.data === 'object' && !Array.isArray(raw?.data) ? raw.data : {}),
        clinics: list,
      },
    };
  },
  getClinicById: async (id) => {
    const response = await apiClient.get(`/clinics/${id}`);
    const raw = response.data;
    const clinic = raw?.data?.clinic || raw?.data;
    const doctors = raw?.data?.doctors || [];
    return {
      ...raw,
      data: {
        clinic,
        doctors,
      },
    };
  },
};

export default clinicsApi;
