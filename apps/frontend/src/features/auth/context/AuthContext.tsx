import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { User, AuthResponse } from '@manish-dev/shared-types';
import { authService } from '../services/authService';

/**
 * Extended user interface with JWT token
 */
export interface AuthUser extends User {
  token?: string;
}

/**
 * Authentication context state interface
 */
export interface AuthContextState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (email: string, password: string, name: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  setAuth: (token: string, user: AuthUser) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'caladrius_auth_token';
const USER_STORAGE_KEY = 'caladrius_auth_user';

/**
 * AuthProvider component that wraps the application and provides authentication state
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Initialize from localStorage if available
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    // Initialize from localStorage if available
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  });

  // Set initial loading to true if we have a token to verify
  const [isLoading, setIsLoading] = useState(() => {
    return !!localStorage.getItem(TOKEN_STORAGE_KEY);
  });
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated
  const isAuthenticated = useMemo(() => !!user && !!token, [user, token]);

  // Track whether persistence effects have run at least once.
  // On the /auth/callback page, AuthCallback (child) writes the token to localStorage
  // before AuthProvider's effects run. Without this guard, the persistence effect
  // fires with token=null and removes the token AuthCallback just stored.
  const hasMounted = useRef(false);

  // Persist auth state to localStorage (write-only; removals happen in logout/verifyAuth)
  useEffect(() => {
    if (!hasMounted.current) return;
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (!hasMounted.current) return;
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  // Verify token on mount
  useEffect(() => {
    hasMounted.current = true;

    const verifyAuth = async () => {
      if (token) {
        setIsLoading(true);
        try {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            setUser({ ...currentUser, token });
          } else {
            // Token is invalid, clear both state and localStorage
            setUser(null);
            setToken(null);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(USER_STORAGE_KEY);
          }
        } catch {
          // Token verification failed, clear both state and localStorage
          setUser(null);
          setToken(null);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
        } finally {
          setIsLoading(false);
        }
      } else {
        // No token to verify, ensure loading is false
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(email, password);
      setUser({ ...response.user, token: response.token });
      setToken(response.token);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.register(email, password, name);
      setUser({ ...response.user, token: response.token });
      setToken(response.token);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set auth state from OAuth callback (token + user from external source)
  const setAuth = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser({ ...newUser, token: newToken });
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
      setError(null);
      setIsLoading(false);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextState>(() => ({
    user,
    token,
    isLoading,
    isAuthenticated,
    error,
    login,
    register,
    logout,
    setAuth,
    clearError,
  }), [user, token, isLoading, isAuthenticated, error, login, register, logout, setAuth, clearError]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to access authentication context
 * @throws Error if used outside of AuthProvider
 */
export function useAuthContext(): AuthContextState {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}

export default AuthContext;
