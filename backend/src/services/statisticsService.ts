import { query } from '../config/db.js';

export class StatisticsService {
  /**
   * Get dashboard statistics (uses materialized view from AK-34)
   */
  static async getDashboardStats(): Promise<any> {
    const result = await query('SELECT * FROM mv_dashboard_stats');
    return result.rows[0] || {
      total_students: 0,
      total_staff: 0,
      active_users: 0,
      active_lost_items: 0,
      active_found_items: 0,
      last_refreshed: null,
    };
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: number): Promise<any> {
    // Posted lost items
    const lostItems = await query(
      'SELECT COUNT(*) as count FROM lost_items WHERE user_id = $1 AND deleted_at IS NULL',
      [userId]
    );

    // Posted found items
    const foundItems = await query(
      'SELECT COUNT(*) as count FROM found_items WHERE user_id = $1 AND deleted_at IS NULL',
      [userId]
    );

    // Resolved items
    const resolvedLost = await query(
      'SELECT COUNT(*) as count FROM lost_items WHERE user_id = $1 AND is_resolved = true AND deleted_at IS NULL',
      [userId]
    );

    const resolvedFound = await query(
      'SELECT COUNT(*) as count FROM found_items WHERE user_id = $1 AND is_resolved = true AND deleted_at IS NULL',
      [userId]
    );

    // Total comments
    const comments = await query(
      'SELECT COUNT(*) as count FROM item_comments WHERE user_id = $1',
      [userId]
    );

    return {
      posted_lost_items: parseInt(lostItems.rows[0].count),
      posted_found_items: parseInt(foundItems.rows[0].count),
      resolved_lost_items: parseInt(resolvedLost.rows[0].count),
      resolved_found_items: parseInt(resolvedFound.rows[0].count),
      total_comments: parseInt(comments.rows[0].count),
    };
  }

  /**
   * Get recent activity (last 7 days)
   */
  static async getRecentActivity(): Promise<any> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const lostItems = await query(
      'SELECT COUNT(*) as count FROM lost_items WHERE created_at >= $1 AND deleted_at IS NULL',
      [sevenDaysAgo]
    );

    const foundItems = await query(
      'SELECT COUNT(*) as count FROM found_items WHERE created_at >= $1 AND deleted_at IS NULL',
      [sevenDaysAgo]
    );

    const comments = await query(
      'SELECT COUNT(*) as count FROM item_comments WHERE created_at >= $1',
      [sevenDaysAgo]
    );

    const resolvedItems = await query(
      `SELECT COUNT(*) as count FROM (
        SELECT resolved_at FROM lost_items WHERE resolved_at >= $1 AND deleted_at IS NULL
        UNION ALL
        SELECT resolved_at FROM found_items WHERE resolved_at >= $1 AND deleted_at IS NULL
      ) as resolved`,
      [sevenDaysAgo]
    );

    return {
      new_lost_items: parseInt(lostItems.rows[0].count),
      new_found_items: parseInt(foundItems.rows[0].count),
      new_comments: parseInt(comments.rows[0].count),
      resolved_items: parseInt(resolvedItems.rows[0].count),
      period: '7 days',
    };
  }

  /**
   * Refresh materialized views
   */
  static async refreshMaterializedViews(): Promise<void> {
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats');
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_lost_items');
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_found_items');
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_room_schedule_summary');
  }
}
