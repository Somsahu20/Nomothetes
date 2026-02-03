import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService } from '../services/auth';
import { setAccessToken } from '../services/api';
import type { LoginCredentials, RegisterData, AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshUser = useCallback(async () => {
    try {
      // Try to refresh token first
      const tokenResponse = await authService.refreshToken();
      setAccessToken(tokenResponse.access_token);

      // Then get user data
      const user = await authService.getCurrentUser();
      setState({
        user,
        accessToken: tokenResponse.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      // User not logged in - this is expected, not an error
      console.error('Auth refresh failed:', error);
      setState({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    // Only try to refresh if we might have a session (check is silent)
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: LoginCredentials) => {
    const tokenResponse = await authService.login(credentials);
    const user = await authService.getCurrentUser();
    setState({
      user,
      accessToken: tokenResponse.access_token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const register = async (data: RegisterData) => {
    await authService.register(data);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore logout errors
    }
    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
