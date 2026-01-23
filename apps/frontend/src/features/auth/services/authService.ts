import type { User, AuthResponse } from '@manish-dev/shared-types';

const API_BASE = '/api/auth';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
    return response.json();
  },

  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }
    return response.json();
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/logout`, { method: 'POST' });
  },

  async getCurrentUser(): Promise<User | null> {
    const response = await fetch(`${API_BASE}/me`);
    if (!response.ok) return null;
    return response.json();
  },
};
