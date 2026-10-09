import { Platform } from 'react-native';
import apiClient from './apiClient';
import { getDeviceId } from '../../utils/deviceId';

export const AuthService = {
    login: async (credentials: any) => {
        const deviceId = await getDeviceId();
        const response = await apiClient.post('/auth/login', { ...credentials, deviceId, platform: Platform.OS });
        return response.data?.data;
    },
    // Public signup: always a COURIER account. The courier profile (and admin
    // approval) comes after, from the onboarding screen.
    register: async (credentials: { email: string; password: string }) => {
        const deviceId = await getDeviceId();
        const response = await apiClient.post('/auth/register', {
            ...credentials,
            role: 'COURIER',
            deviceId,
            platform: Platform.OS,
        });
        return response.data?.data;
    },
    logout: async () => {
        const response = await apiClient.post('/auth/logout');
        return response.data?.data;
    },
    logoutAll: async () => {
        const response = await apiClient.post('/auth/logout-all');
        return response.data?.data;
    },
    refresh: async (refreshToken: string) => {
        const deviceId = await getDeviceId();
        const response = await apiClient.post('/auth/refresh', { refreshToken, deviceId, platform: Platform.OS });
        return response.data?.data;
    },
};
