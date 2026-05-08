import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../config/db';

export interface AuthenticatedRequest extends Request {
  userId?: number;
  userRole?: string;
  userEmail?: string;
  sessionId?: number;
  isBanned?: boolean;
}

export interface SessionRow {
  user_id: number;
  session_id: number;
  role: string;
  email: string;
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

    let session = await queryOne<SessionRow>(
      `SELECT us.user_id, us.session_id, u.role, u.email
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
    req.userRole = session.role;
    req.sessionId = session.session_id;
    req.userEmail = String(session.email || '').trim().toLowerCase();

    try {
      const banRow = await queryOne<{ is_banned: boolean }>(
        'SELECT COALESCE(is_banned, false) AS is_banned FROM users WHERE user_id = $1',
        [session.user_id]
      );
      (req as AuthenticatedRequest).isBanned = banRow?.is_banned ?? false;
    } catch {
      (req as AuthenticatedRequest).isBanned = false;
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
