import { Router } from 'express';
import { StatisticsController } from '../controllers/statisticsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/statistics/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_students:
 *                   type: integer
 *                 total_staff:
 *                   type: integer
 *                 active_users:
 *                   type: integer
 *                 active_lost_items:
 *                   type: integer
 *                 active_found_items:
 *                   type: integer
 */
router.get('/dashboard', StatisticsController.getDashboardStats);

/**
 * @swagger
 * /api/statistics/user/{userId}:
 *   get:
 *     summary: Get user statistics
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User statistics
 */
router.get('/user/:userId', authenticateToken, StatisticsController.getUserStats);

/**
 * @swagger
 * /api/statistics/activity:
 *   get:
 *     summary: Get recent activity (last 7 days)
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Recent activity statistics
 */
router.get('/activity', StatisticsController.getRecentActivity);

/**
 * @swagger
 * /api/statistics/refresh:
 *   post:
 *     summary: Refresh materialized views (admin only)
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Views refreshed successfully
 */
router.post('/refresh', authenticateToken, requireRole('admin'), StatisticsController.refreshViews);

export default router;
