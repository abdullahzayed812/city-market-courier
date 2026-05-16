import apiClient from './apiClient';
import {
  ApiResponse,
  Courier,
  Delivery,
  UpdateDeliveryStatusDto,
} from '@city-market/shared';

export const DeliveryService = {
  getProfile: async () => {
    const response = await apiClient.get<ApiResponse<Courier>>(
      '/delivery/couriers/me',
    );
    return response.data?.data;
  },
  updateAvailability: async (courierId: string, isAvailable: boolean) => {
    // Renamed parameter to isAvailable
    const response = await apiClient.patch<ApiResponse<null>>(
      `/delivery/couriers/${courierId}/availability`,
      { isAvailable }, // Corrected parameter name
    );
    return response.data?.data;
  },
  getPendingDeliveries: async () => {
    const response = await apiClient.get<ApiResponse<Delivery[]>>(
      '/delivery/deliveries/pending',
    );
    return response.data?.data;
  },
  getMyDeliveries: async (page: number) => {
    const response = await apiClient.get<ApiResponse<{ items: Delivery[]; hasNextPage: boolean }>>(
      '/delivery/deliveries/my-deliveries',
      { params: { page, limit: 20 } },
    );
    return response.data.data!;
  },
  getDeliveryById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Delivery>>(
      `/delivery/deliveries/${id}`,
    );
    return response.data?.data;
  },
  updateStatus: async (id: string, updateDto: UpdateDeliveryStatusDto) => {
    const response = await apiClient.patch<ApiResponse<null>>(
      `/delivery/deliveries/${id}/status`,
      updateDto,
    );
    return response.data?.data;
  },
  cancelByCourier: async (id: string, reason: string) => {
    const response = await apiClient.patch<ApiResponse<null>>(
      `/delivery/deliveries/${id}/cancel-by-courier`,
      { reason },
    );
    return response.data?.data;
  },

  getCourierPendingEarnings: async (courierId: string) => {
    const response = await apiClient.get<ApiResponse<any>>(
      `/delivery/courier-settlements/courier/${courierId}/pending`,
    );
    return response.data?.data;
  },

  getCourierSettlements: async (courierId: string, limit = 10, offset = 0) => {
    const response = await apiClient.get<ApiResponse<any[]>>(
      `/delivery/courier-settlements?courierId=${courierId}&limit=${limit}&offset=${offset}`,
    );
    return response.data?.data;
  },
};
