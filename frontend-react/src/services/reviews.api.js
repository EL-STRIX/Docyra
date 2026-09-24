import apiClient from './apiClient.js';

export const reviewsApi = {
  submitReview: async (payload) => {
    const response = await apiClient.post('/reviews', payload);
    return response.data;
  },
  getMyReviews: async (params = {}) => {
    const response = await apiClient.get('/reviews/my', { params });
    return response.data;
  },
  getDoctorReviews: async (doctorId, params = {}) => {
    const response = await apiClient.get(`/doctors/${doctorId}/reviews`, { params });
    return response.data;
  },
};

export default reviewsApi;
