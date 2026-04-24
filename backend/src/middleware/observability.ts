import type { NextFunction, Request, Response } from 'express';
import env from '../config/env';
import { logger } from '../utils/logger';

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();
  const requestId = (req as any).requestId as string | undefined;

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info('HTTP request completed', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  });

  next();
}

export async function reportException(error: unknown, req?: Request): Promise<void> {
  const isMonitoringActive = env.MONITORING_ENABLED && Boolean(env.MONITORING_WEBHOOK_URL);
  if (!isMonitoringActive) {
    return;
  }

  try {
    const asError = error instanceof Error ? error : new Error(String(error));
    await fetch(env.MONITORING_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        service: 'universe-backend',
        type: 'unhandled_exception',
        message: asError.message,
        stack: asError.stack,
        timestamp: new Date().toISOString(),
        request: req
          ? {
              method: req.method,
              path: req.originalUrl,
              requestId: (req as any).requestId,
            }
          : undefined,
      }),
    });
  } catch (reportErr) {
    logger.warn('Monitoring webhook delivery failed', {
      message: reportErr instanceof Error ? reportErr.message : String(reportErr),
    });
  }
}
