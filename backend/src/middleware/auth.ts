import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../config/db.js';

export interface AuthenticatedRequest extends Request {
  userId?: number;
  userRole?: 'student' | 'staff' | 'admin';
  sessionId?: number;
  body: Request['body'];
  query: Request['query'];
  params: Request['params'];
}

interface SessionRow {
  user_id: number;
  session_id: number;
  role: string;
}

export async function authenticateSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const sessionToken = authHeader.substring(7);

    const session = await queryOne<SessionRow>(
      `SELECT 
        us.user_id,
        us.session_id,
        u.role
      FROM user_sessions us
      JOIN users u ON u.user_id = us.user_id
      WHERE us.session_token = $1
        AND us.expires_at > NOW()
        AND u.is_active = true`,
      [sessionToken]
    );

    if (!session) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
      return;
    }

    req.userId = session.user_id;
    req.userRole = session.role as 'student' | 'staff' | 'admin';
    req.sessionId = session.session_id;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function requireRole(...allowedRoles: Array<'student' | 'staff' | 'admin'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.userRole)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
}

