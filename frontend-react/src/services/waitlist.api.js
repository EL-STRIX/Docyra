import apiClient from './apiClient.js';

export const waitlistApi = {
  joinWaitlist: async (payload) => {
    const response = await apiClient.post('/waitlists', payload);
    return response.data;
  },
  getMyWaitlists: async () => {
    const response = await apiClient.get('/waitlists/my');
    return response.data;
  },
};

export default waitlistApi;
