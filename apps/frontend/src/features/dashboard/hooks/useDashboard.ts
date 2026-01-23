import { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import type { DashboardStats } from '@manish-dev/shared-types';

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardService.getStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, isLoading, error };
}
