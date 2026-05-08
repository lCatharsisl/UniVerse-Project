import { Router, type Request, type Response } from 'express';
import { getPool } from '../config/db';
import { logger } from '../utils/logger';

const router = Router();

function livenessPayload() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };
}

/**
 * Liveness endpoint
 * GET /health
 * GET /health/live
 */
router.get(['/health', '/health/live'], (_req: Request, res: Response) => {
  res.status(200).json(livenessPayload());
});

/**
 * Readiness endpoint
 * GET /ready
 * GET /health/ready
 */
router.get(['/ready', '/health/ready'], async (_req: Request, res: Response) => {
  const readiness = {
    ...livenessPayload(),
    status: 'ready',
    services: {
      database: 'unknown',
    },
  };

  try {
    await getPool().query('SELECT 1');
    readiness.services.database = 'connected';
    res.status(200).json(readiness);
  } catch (error) {
    logger.error('Readiness check failed', { error });
    readiness.status = 'not ready';
    readiness.services.database = 'disconnected';
    res.status(503).json({
      ...readiness,
      status: 'not ready',
    });
  }
});

export default router;
