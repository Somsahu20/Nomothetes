export interface User {
  user_id: string;
  email: string;
  full_name: string;
  organization?: string;
  created_at: string;
  last_login?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  full_name: string;
  organization?: string;
  password: string;
  
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user_id: string;
}
