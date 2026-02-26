import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID middleware
 * Generates or uses existing request ID for tracing
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Get request ID from header or generate new one
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  
  // Attach to request
  (req as any).requestId = requestId;
  
  // Set response header
  res.setHeader('X-Request-ID', requestId);
  
  next();
};
