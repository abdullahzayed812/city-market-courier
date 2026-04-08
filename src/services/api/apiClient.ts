import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../locales/i18n';
import { getApiBaseURL } from '../../utils/serverConfig';

const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async config => {
    // Dynamically set baseURL if not provided
    if (!config.baseURL) {
      config.baseURL = await getApiBaseURL();
    }

    const token = await AsyncStorage.getItem('auth_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers['Accept-Language'] = i18n.language || 'ar';

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
          const API_URL = await getApiBaseURL();
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });
          const { accessToken } = response.data?.data;
          await AsyncStorage.setItem('auth_token', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
        // Navigation to login should be handled by the app state (e.g., AuthContext)
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
