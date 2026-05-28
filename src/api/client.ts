import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/authStore';

const expoBaseUrl =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined);

const baseURL = expoBaseUrl ?? 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL,
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let queue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const flushQueue = (error: unknown, token: string | null) => {
  queue.forEach((p) => {
    if (error) p.reject(error);
    else if (token) p.resolve(token);
  });
  queue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retry) {
      throw error;
    }

    const { refreshToken, logout, setTokens } = useAuthStore.getState();
    if (!refreshToken) {
      logout();
      throw error;
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject
        });
      });
    }

    isRefreshing = true;
    original._retry = true;

    try {
      const resp = await axios.post(`${baseURL}/api/token/refresh/`, {
        refresh: refreshToken
      });
      const newAccess = resp.data.access;
      setTokens({ accessToken: newAccess, refreshToken });
      flushQueue(null, newAccess);
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      logout();
      throw refreshError;
    } finally {
      isRefreshing = false;
    }
  }
);

export { baseURL };
