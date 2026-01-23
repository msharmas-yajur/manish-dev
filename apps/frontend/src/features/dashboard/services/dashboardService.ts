import type { DashboardStats } from '@manish-dev/shared-types';

const API_BASE = '/api/dashboard';

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }
    return response.json();
  },
};
