import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage
let accessToken: string | null = null;
let isRefreshing = false;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// Request interceptor - add token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Don't retry refresh token requests or if already retrying
    const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest && !isRefreshing) {
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await api.post('/api/auth/refresh');
        const newToken = response.data.access_token;
        setAccessToken(newToken);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        setAccessToken(null);
        // Don't redirect on refresh failure - let the auth context handle it
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
