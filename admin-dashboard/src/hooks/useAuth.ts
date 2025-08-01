import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const STORAGE_KEY = 'admin_token';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    accessToken: localStorage.getItem(STORAGE_KEY),
    isLoading: true,
    isAuthenticated: false,
  });

  // Token refresh functionality (disabled for mock backend)
  const refreshToken = useCallback(async () => {
    console.log('🔧 AUTH: Token refresh called but disabled for mock backend');
    return false;
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log('🔑 USEAUTH: Login attempt starting', email);
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await api.login({ email, password });
      console.log('🔑 USEAUTH: API login returned', response);
      const token = response.accessToken;
      
      console.log('🔑 USEAUTH: Extracted token', token);
      localStorage.setItem(STORAGE_KEY, token);
      
      // Update API client with new token
      api.setToken(token);
      
      setAuthState({
        user: response.user,
        accessToken: token,
        isLoading: false,
        isAuthenticated: true,
      });
      
      console.log('🔑 USEAUTH: Auth state updated, user is now authenticated');
      console.log('🔑 USEAUTH: Login successful, returning success');
      return { success: true };
    } catch (error: unknown) {
      console.log('🔑 USEAUTH: Login failed with error', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      console.log('🔑 USEAUTH: Returning error', errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      setAuthState({
        user: null,
        accessToken: null,
        isLoading: false,
        isAuthenticated: false,
      });
      api.setToken(null);
    }
  }, []);

  // Check if user has permission
  const hasPermission = useCallback((permission: string) => {
    return authState.user?.permissions?.includes(permission) || false;
  }, [authState.user]);

  // Check if user has role
  const hasRole = useCallback((role: string) => {
    return authState.user?.role === role;
  }, [authState.user]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = authState.accessToken;
      
      if (token && !authState.isAuthenticated) {
        // We have a token but user isn't authenticated yet
        // For the mock backend, we'll assume the token is valid if it exists
        console.log('🔧 AUTH INIT: Found existing token, setting up auth state');
        api.setToken(token);
        
        // Create a minimal user object for the token
        // In a real app, this would come from token verification
        const mockUser = {
          id: 2,
          email: 'management@bookmyreservation.org',
          name: 'Management User',
          role: 'admin' as const,
          permissions: ['admin'] as string[],
          isVerified: true,
          createdAt: new Date().toISOString()
        };
        
        setAuthState(prev => ({
          ...prev,
          user: mockUser,
          isAuthenticated: true,
          isLoading: false,
        }));
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, [authState.accessToken, authState.isAuthenticated]);

  // Set up automatic token refresh (disabled for mock backend)
  useEffect(() => {
    // In a real app, you would set up token refresh here
    // For the mock backend, we'll skip this to avoid 401 errors
    console.log('🔧 AUTH: Token refresh disabled for mock backend');
  }, [authState.isAuthenticated]);

  return {
    user: authState.user,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    login,
    logout,
    hasPermission,
    hasRole,
    refreshToken,
  };
};