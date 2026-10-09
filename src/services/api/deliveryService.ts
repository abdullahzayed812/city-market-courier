import apiClient from './apiClient';
import {
  ApiResponse,
  Courier,
  Delivery,
  UpdateDeliveryStatusDto,
} from '@city-market/shared';

export interface MyRatingsResult {
  summary: { averageRating: number | null; totalRatings: number; distribution: Record<string, number> };
  items: Array<{ id: string; customerOrderId: string; stars: number; comment: string | null; createdAt: string }>;
  hasNextPage: boolean;
}

export const DeliveryService = {
  // Customer ratings of this courier's deliveries (the server scopes it to the caller)
  getMyRatings: async () => {
    const response = await apiClient.get<ApiResponse<MyRatingsResult>>('/delivery/delivery-ratings', { params: { limit: 50 } });
    return response.data?.data;
  },
  registerFreelancer: async (dto: {
    fullName: string;
    phone: string;
    vehicleType: string;
    licensePlate?: string;
    nationalIdUrl: string;
    licenseUrl?: string;
  }) => {
    const response = await apiClient.post<ApiResponse<Courier>>(
      '/delivery/couriers/freelance/register',
      dto,
    );
    return response.data?.data;
  },
  getProfile: async () => {
    const response = await apiClient.get<ApiResponse<Courier>>(
      '/delivery/couriers/me',
    );
    return response.data?.data;
  },
  updateAvailability: async (isAvailable: boolean) => {
    const response = await apiClient.patch<ApiResponse<null>>(
      '/delivery/couriers/me/availability',
      { isAvailable },
    );
    return response.data?.data;
  },
  updateLocation: async (latitude: number, longitude: number) => {
    await apiClient.patch<ApiResponse<null>>('/delivery/couriers/me/location', {
      latitude,
      longitude,
    });
  },
  // Freelancers only: unclaimed deliveries near the courier, nearest first
  getAvailableJobs: async () => {
    const response = await apiClient.get<
      ApiResponse<Array<Delivery & { distanceKm: number | null }>>
    >('/delivery/deliveries/freelance/available');
    return response.data?.data ?? [];
  },
  claimDelivery: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<null>>(
      `/delivery/deliveries/${id}/claim`,
    );
    return response.data?.data;
  },
  // Courier can't make it (before pickup). Not the same as cancelByCourier,
  // which reports a customer problem and fails the order.
  releaseDelivery: async (id: string, reason?: string) => {
    const response = await apiClient.patch<ApiResponse<null>>(
      `/delivery/deliveries/${id}/release`,
      { reason },
    );
    return response.data?.data;
  },
  getPendingDeliveries: async () => {
    const response = await apiClient.get<ApiResponse<Delivery[]>>(
      '/delivery/deliveries/pending',
    );
    return response.data?.data;
  },
  getMyDeliveries: async (page: number = 1) => {
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
