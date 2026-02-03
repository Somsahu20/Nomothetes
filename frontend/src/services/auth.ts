import api, { setAccessToken } from './api';
import type {
  User,
  LoginCredentials,
  RegisterData,
  TokenResponse,
  RegisterResponse
} from '../types/auth';

export const authService = {
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/api/auth/login', credentials);
    setAccessToken(response.data.access_token);
    return response.data;
  },

  async register(data: RegisterData): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/api/auth/register', data);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/api/auth/me');
    return response.data;
  },

  async refreshToken(): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/api/auth/refresh');
    setAccessToken(response.data.access_token);
    return response.data;
  },
};
