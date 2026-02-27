import { Request, Response } from 'express';
import { RegisterHandler } from '../../application/commands/register.handler';
import { LoginHandler } from '../../application/commands/login.handler';
import { UpdateProfileHandler } from '../../application/commands/update-profile.handler';
import { authenticateSession, AuthenticatedRequest } from '../../../../middleware/auth';
import { IdentityService } from '../../infrastructure/identity.service';

export class IdentityController {
  static async register(req: Request, res: Response) {
    const result = await RegisterHandler.execute(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    return res.status(201).json(result.data);
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await LoginHandler.execute(email, password);
    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }
    // Keep sessionToken key for frontend compatibility
    const { token, user } = result.data as any;
    return res.json({ sessionToken: token, user });
  }

  static auth = authenticateSession;

  static async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await IdentityService.getCurrentUser(req.userId!);
      return res.json(user);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const token = req.headers.authorization?.substring(7);
      if (token) await IdentityService.logout(token);
      return res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    const result = await UpdateProfileHandler.execute(req.userId!, req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Profile updated successfully' });
  }

  static async getPublicProfile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const profile = await IdentityService.getPublicProfile(parseInt(id));
      return res.json(profile);
    } catch (error: any) {
      return res.status(error.status || 500).json({ error: error.message });
    }
  }

  static async uploadAvatar(req: AuthenticatedRequest, res: Response) {
    try {
      const file = (req as any).file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const avatarUrl = `/uploads/${file.filename}`;
      const result = await UpdateProfileHandler.execute(req.userId!, { avatarUrl });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({ avatarUrl });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
