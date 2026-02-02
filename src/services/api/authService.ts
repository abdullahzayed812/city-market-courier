import apiClient from './apiClient';

export const AuthService = {
    login: async (credentials: any) => {
        const response = await apiClient.post('/auth/login', credentials);
        return response.data?.data;
    },
    logout: async (refreshToken: string) => {
        const response = await apiClient.post('/auth/logout', { refreshToken });
        return response.data?.data;
    },
    refresh: async (refreshToken: string) => {
        const response = await apiClient.post('/auth/refresh', { refreshToken });
        return response.data?.data;
    },
};
