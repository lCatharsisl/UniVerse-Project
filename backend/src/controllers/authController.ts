import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AuthService } from '../services/authService.js';
import { AppError } from '../middleware/errorHandler.js';

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, emailToken } = await AuthService.register(req.body);

      res.status(201).json({
        message: 'User registered successfully',
        userId,
        emailToken, // In production, send via email instead
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to register user' });
    }
  }

  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const { sessionToken, expiresAt } = await AuthService.login(email, password);

      res.json({
        message: 'Login successful',
        sessionToken,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to login' });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const sessionToken = authHeader.substring(7);
        await AuthService.logout(sessionToken);
      }

      res.json({ message: 'Logout successful' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to logout' });
    }
  }

  static async verifyEmail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      await AuthService.verifyEmail(token);

      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to verify email' });
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await AuthService.getCurrentUser(req.userId);
      res.json(user);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to get user info' });
    }
  }
}
