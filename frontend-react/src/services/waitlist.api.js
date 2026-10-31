import apiClient from './apiClient.js';

export const waitlistApi = {
  joinWaitlist: async (payload) => {
    const response = await apiClient.post('/waitlists', payload);
    return response.data;
  },
  getMyWaitlists: async () => {
    const response = await apiClient.get('/waitlists/my');
    const raw = response.data;
    const list = Array.isArray(raw?.data) ? raw.data : (raw?.data?.waitlists || []);
    return {
      ...raw,
      data: {
        waitlists: list,
      },
    };
  },
};

export default waitlistApi;
