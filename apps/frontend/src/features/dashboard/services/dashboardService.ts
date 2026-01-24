import type { DashboardStats } from '@manish-dev/shared-types';

const API_BASE = '/api/dashboard';

// Mock data for when backend is not available
const mockStats: DashboardStats = {
  totalUsers: 1250,
  activeUsers: 847,
  newUsersToday: 23,
  revenue: 54320,
  activeSessions: 156,
  totalReports: 89,
};

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      if (!response.ok) {
        return mockStats;
      }
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return mockStats;
      }
      return response.json();
    } catch {
      return mockStats;
    }
  },
};
