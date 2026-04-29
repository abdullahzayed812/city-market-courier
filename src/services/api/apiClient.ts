import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../locales/i18n';
import { getApiBaseURL } from '../../utils/serverConfig';

let signOutCallback: (() => void) | null = null;
export const setSignOutCallback = (fn: () => void) => { signOutCallback = fn; };

const apiClient = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  async config => {
    if (!config.baseURL) config.baseURL = await getApiBaseURL();
    const token = await AsyncStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers['Accept-Language'] = i18n.language || 'ar';
    return config;
  },
  error => Promise.reject(error),
);

// ── Refresh-token machinery ───────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token!)));
  failedQueue = [];
};

const clearSession = async () => {
  await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user']);
  signOutCallback?.();
};

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const refreshToken = await AsyncStorage.getItem('refresh_token');
    if (!refreshToken) {
      await clearSession();
      return Promise.reject(error);
    }

    // If a refresh is already in-flight, queue this request and wait
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        })
        .catch(err => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const API_URL = await getApiBaseURL();
      const { data } = await axios.post(
        `${API_URL}/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );
      const { accessToken, refreshToken: newRefreshToken } = data.data;
      await AsyncStorage.setItem('auth_token', accessToken);
      await AsyncStorage.setItem('refresh_token', newRefreshToken);
      processQueue(null, accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await clearSession();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
