import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { StatisticsService } from '../services/statisticsService.js';
import { AppError } from '../middleware/errorHandler.js';

export class StatisticsController {
  /**
   * Get dashboard statistics
   * GET /api/statistics/dashboard
   */
  static async getDashboardStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await StatisticsService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  }

  /**
   * Get user statistics
   * GET /api/statistics/user/:userId
   */
  static async getUserStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only see their own stats unless admin
      if (req.userId !== userId && req.userRole !== 'admin') {
        res.status(403).json({ error: 'Forbidden: You can only view your own statistics' });
        return;
      }

      const stats = await StatisticsService.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
  }

  /**
   * Get recent activity
   * GET /api/statistics/activity
   */
  static async getRecentActivity(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const activity = await StatisticsService.getRecentActivity();
      res.json(activity);
    } catch (error) {
      console.error('Get recent activity error:', error);
      res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
  }

  /**
   * Refresh materialized views (admin only)
   * POST /api/statistics/refresh
   */
  static async refreshViews(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (req.userRole !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Admin only' });
        return;
      }

      await StatisticsService.refreshMaterializedViews();
      res.json({ message: 'Materialized views refreshed successfully' });
    } catch (error) {
      console.error('Refresh views error:', error);
      res.status(500).json({ error: 'Failed to refresh materialized views' });
    }
  }
}
