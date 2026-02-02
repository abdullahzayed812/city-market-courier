import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to access host machine's localhost
// iOS simulator can use localhost directly
const getBaseURL = () => {
    if (__DEV__) {
        return Platform.OS === 'android'
            ? 'http://10.0.2.2:3000/api/v1' // Android emulator
            : 'http://localhost:3000/api/v1'; // iOS simulator
    }
    return 'https://your-production-api.com/api/v1'; // Production
};

const API_URL = getBaseURL();

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    async config => {
        const token = await AsyncStorage.getItem('auth_token');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    },
);

apiClient.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = await AsyncStorage.getItem('refresh_token');
                if (refreshToken) {
                    const response = await axios.post(`${API_URL}/auth/refresh`, {
                        refreshToken,
                    });
                    const { token } = response.data;
                    await AsyncStorage.setItem('auth_token', token);
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
                // Navigation to login should be handled by the app state (e.g., AuthContext)
            }
        }
        return Promise.reject(error);
    },
);

export default apiClient;
