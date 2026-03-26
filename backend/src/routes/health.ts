import { Router, type Request, type Response } from 'express';
import { getPool } from '../config/db';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/health', async (_req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'unknown',
    },
  };

  try {
    await getPool().query('SELECT 1');
    healthCheck.services.database = 'connected';
    
    res.status(200).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed', { error });
    healthCheck.status = 'error';
    healthCheck.services.database = 'disconnected';
    
    res.status(503).json(healthCheck);
  }
});

/**
 * Readiness check endpoint
 * GET /ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check if app is ready to serve requests
    await getPool().query('SELECT 1');
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
