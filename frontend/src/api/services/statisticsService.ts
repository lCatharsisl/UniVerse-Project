import apiClient from '../client';

interface DashboardStats {
  total_students: number;
  total_staff: number;
  active_users: number;
  active_lost_items: number;
  active_found_items: number;
  last_refreshed?: string;
}

interface UserStats {
  posted_lost_items: number;
  posted_found_items: number;
  resolved_lost_items: number;
  resolved_found_items: number;
  total_comments: number;
}

interface ActivityStats {
  new_lost_items: number;
  new_found_items: number;
  new_comments: number;
  resolved_items: number;
  period: string;
}

export const statisticsService = {
  /**
   * Get dashboard statistics
   */
  getDashboard: () =>
    apiClient.get<DashboardStats>('/statistics/dashboard'),

  /**
   * Get user statistics
   */
  getUserStats: (userId: number) =>
    apiClient.get<UserStats>(`/statistics/user/${userId}`),

  /**
   * Get recent activity (last 7 days)
   */
  getActivity: () =>
    apiClient.get<ActivityStats>('/statistics/activity'),

  /**
   * Refresh materialized views (admin only)
   */
  refreshViews: () =>
    apiClient.post('/statistics/refresh'),
};
