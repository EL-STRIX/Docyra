import apiClient from './apiClient.js';

export const reviewsApi = {
  submitReview: async (payload) => {
    const response = await apiClient.post('/reviews', payload);
    const raw = response.data;
    return {
      ...raw,
      data: {
        review: raw?.data?.review || raw?.data,
      },
    };
  },
  getMyReviews: async (params = {}) => {
    const response = await apiClient.get('/reviews/my', { params });
    const raw = response.data;
    const list = Array.isArray(raw?.data) ? raw.data : (raw?.data?.reviews || []);
    return {
      ...raw,
      data: {
        reviews: list,
      },
    };
  },
  getDoctorReviews: async (doctorId, params = {}) => {
    const response = await apiClient.get(`/doctors/${doctorId}/reviews`, { params });
    const raw = response.data;
    const list = Array.isArray(raw?.data) ? raw.data : (raw?.data?.reviews || []);
    return {
      ...raw,
      data: {
        reviews: list,
      },
    };
  },
};

export default reviewsApi;
