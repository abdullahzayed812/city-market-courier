import apiClient from './apiClient';
import { ApiResponse, Courier, Delivery, DeliveryStatus, UpdateDeliveryStatusDto } from '@city-market/shared';

export const DeliveryService = {
  getProfile: async () => {
    const response = await apiClient.get<ApiResponse<Courier>>('/delivery/couriers/me');
    return response.data?.data;
  },
  updateAvailability: async (courierId: string, isAvailable: boolean) => { // Renamed parameter to isAvailable
    const response = await apiClient.patch<ApiResponse<null>>(
      `/delivery/couriers/${courierId}/availability`,
      { isAvailable }, // Corrected parameter name
    );
    return response.data?.data;
  },
  getPendingDeliveries: async () => {
    const response = await apiClient.get<ApiResponse<Delivery[]>>('/delivery/deliveries/pending');
    return response.data?.data;
  },
  getMyDeliveries: async () => {
    const response = await apiClient.get<ApiResponse<Delivery[]>>('/delivery/deliveries/my-deliveries'); // Corrected endpoint
    return response.data?.data;
  },
  getDeliveryById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Delivery>>(`/delivery/deliveries/${id}`);
    return response.data?.data;
  },
  updateStatus: async (id: string, updateDto: UpdateDeliveryStatusDto) => { // Using UpdateDeliveryStatusDto
    const response = await apiClient.patch<ApiResponse<null>>(
      `/delivery/deliveries/${id}/status`,
      updateDto, // Pass the DTO
    );
    return response.data?.data;
  },
};
