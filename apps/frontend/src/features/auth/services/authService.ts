import type { User, AuthResponse } from '@manish-dev/shared-types';

const API_BASE = '/api/auth';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        throw new Error('Login failed');
      }
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Backend not available');
      }
      return response.json();
    } catch {
      throw new Error('Login service unavailable');
    }
  },

  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      if (!response.ok) {
        throw new Error('Registration failed');
      }
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Backend not available');
      }
      return response.json();
    } catch {
      throw new Error('Registration service unavailable');
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/logout`, { method: 'POST' });
    } catch {
      // Ignore errors on logout
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE}/me`);
      if (!response.ok) return null;
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return null;
      }
      return response.json();
    } catch {
      return null;
    }
  },
};
