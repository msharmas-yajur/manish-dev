import { useDashboard } from '../hooks/useDashboard';
import { StatsCard } from './StatsCard';

export function Dashboard() {
  const { stats, isLoading, error } = useDashboard();

  if (isLoading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">Error: {error}</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
      </header>
      <div className="dashboard-stats">
        <StatsCard title="Total Users" value={stats?.totalUsers ?? 0} />
        <StatsCard title="Active Sessions" value={stats?.activeSessions ?? 0} />
        <StatsCard title="Total Reports" value={stats?.totalReports ?? 0} />
      </div>
    </div>
  );
}
