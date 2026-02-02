import apiClient from './apiClient';

export const DeliveryService = {
  getProfile: async () => {
    const response = await apiClient.get('/delivery/couriers/me');
    return response.data?.data;
  },
  updateAvailability: async (courierId: string, available: boolean) => {
    const response = await apiClient.patch(
      `/delivery/couriers/${courierId}/availability`,
      { available },
    );
    return response.data?.data;
  },
  getPendingDeliveries: async () => {
    const response = await apiClient.get('/delivery/deliveries/pending');
    return response.data?.data;
  },
  getMyDeliveries: async () => {
    const response = await apiClient.get('/delivery/deliveries/my');
    return response.data?.data;
  },
  getDeliveryById: async (id: string) => {
    const response = await apiClient.get(`/delivery/deliveries/${id}`);
    return response.data?.data;
  },
  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(
      `/delivery/deliveries/${id}/status`,
      { status },
    );
    return response.data?.data;
  },
};
