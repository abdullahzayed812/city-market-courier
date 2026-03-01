import apiClient from './apiClient';
import { ApiResponse, AppType, PlatformType } from '@city-market/shared';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

export const NotificationService = {
  registerDevice: async (
    token: string,
    platform: PlatformType,
    appType: AppType,
  ) => {
    const response = await apiClient.post<ApiResponse<null>>(
      '/notification/device-token',
      {
        token,
        platform,
        appType,
      },
    );
    return response.data?.data;
  },

  getNotifications: async (page: number = 1, limit: number = 20) => {
    const response = await apiClient.get<
      ApiResponse<{ items: Notification[]; unread: number }>
    >('/notification/notifications', { params: { page, limit } });
    return response.data?.data;
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<null>>(
      `/notification/notifications/${id}/read`,
    );
    return response.data?.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.patch<ApiResponse<null>>(
      '/notification/notifications/read-all',
    );
    return response.data?.data;
  },
};
