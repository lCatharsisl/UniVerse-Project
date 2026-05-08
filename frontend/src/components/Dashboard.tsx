import React, { useCallback, useEffect, useState } from 'react';
import { statisticsService } from '../api/services/statisticsService';
import { Loading } from './Loading';
import '../styles/components.css';

interface DashboardStats {
  total_students: number;
  total_staff: number;
  active_users: number;
  active_lost_items: number;
  active_found_items: number;
  last_refreshed?: string;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await statisticsService.getDashboard();
      setStats(data);
    } catch (err: unknown) {
      setError('Failed to load dashboard statistics');
      console.error('Load stats error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStats();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadStats]);

  if (loading) return <Loading message="Loading dashboard..." />;
  if (error) return <div className="error-container">{error}</div>;
  if (!stats) return <div className="error-container">No data available</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard Statistics</h2>
        {stats.last_refreshed && (
          <span className="last-updated">
            Last updated: {new Date(stats.last_refreshed).toLocaleString()}
          </span>
        )}
      </div>

      <div className="stats-grid">
        <StatCard 
          title="Active Users" 
          value={stats.active_users} 
          icon="👥"
          color="blue"
        />
        <StatCard 
          title="Students" 
          value={stats.total_students} 
          icon="🎓"
          color="green"
        />
        <StatCard 
          title="Staff" 
          value={stats.total_staff} 
          icon="👨‍🏫"
          color="purple"
        />
        <StatCard 
          title="Lost Items" 
          value={stats.active_lost_items} 
          icon="🔍"
          color="orange"
        />
        <StatCard 
          title="Found Items" 
          value={stats.active_found_items} 
          icon="✅"
          color="teal"
        />
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon?: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = 'blue' }) => (
  <div className={`stat-card stat-card-${color}`}>
    {icon && <div className="stat-icon">{icon}</div>}
    <div className="stat-info">
      <h3>{title}</h3>
      <p className="stat-value">{value}</p>
    </div>
  </div>
);
