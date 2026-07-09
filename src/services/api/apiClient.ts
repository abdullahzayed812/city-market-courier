import axios from 'axios';
import { Platform } from 'react-native';
import i18n from '../../locales/i18n';
import { getApiBaseURL } from '../../utils/serverConfig';
import { SecureStorage } from '../secureStorage';
import { getDeviceId } from '../../utils/deviceId';

let signOutCallback: (() => void) | null = null;
export const setSignOutCallback = (fn: () => void) => { signOutCallback = fn; };

const apiClient = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  async config => {
    if (!config.baseURL) config.baseURL = await getApiBaseURL();
    const token = await SecureStorage.getAccessToken();
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
  await SecureStorage.clearAll();
  signOutCallback?.();
};

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const refreshToken = await SecureStorage.getRefreshToken();
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
      const deviceId = await getDeviceId();
      const { data } = await axios.post(
        `${API_URL}/auth/refresh`,
        { refreshToken, deviceId, platform: Platform.OS },
        { headers: { 'Content-Type': 'application/json' } },
      );
      const { accessToken, refreshToken: newRefreshToken } = data.data;
      await SecureStorage.setAccessToken(accessToken);
      await SecureStorage.setRefreshToken(newRefreshToken);
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
