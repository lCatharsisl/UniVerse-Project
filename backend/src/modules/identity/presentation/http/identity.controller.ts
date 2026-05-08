import { Request, Response } from 'express';
import { storeProfileImage } from '../../../../integrations/profileStorage';
import { RegisterHandler } from '../../application/commands/register.handler';
import { LoginHandler } from '../../application/commands/login.handler';
import { UpdateProfileHandler } from '../../application/commands/update-profile.handler';
import { authenticateSession, AuthenticatedRequest } from '../../../../middleware/auth';
import { IdentityService } from '../../infrastructure/identity.service';
import { AppError } from '../../../../shared/core/errors';

export class IdentityController {
  static async register(req: Request, res: Response) {
    const result = await RegisterHandler.execute(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    return res.status(201).json(result.data);
  }

  static async login(req: Request, res: Response) {
    const rawEmail = req.body?.email;
    const password = req.body?.password;
    const email =
      typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || '';
    const result = await LoginHandler.execute(email, password, userAgent, ipAddress);
    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }
    const { token, user } = result.data as any;
    return res.json({ sessionToken: token, user });
  }

  static auth = authenticateSession;

  static async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await IdentityService.getCurrentUser(req.userId!);
      return res.json(user);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      const pgCode =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: unknown }).code)
          : '';
      if (pgCode === '42703' || pgCode === '42P01') {
        console.error(
          '[auth/me] Veritabanı şeması eksik (kolon/tablo). migrations/ ve backend `npm run` *migrate* scriptlerini çalıştırın.',
          error
        );
        return res.status(503).json({
          error:
            'Veritabanı şeması güncel değil. Geliştirici: backend kökünde bekleyen SQL migration’larını uygulayın (ör. users uyarı kolonları, push_subscriptions).',
        });
      }
      const msg = error instanceof Error ? error.message : 'Failed to load user';
      console.error('[auth/me]', error);
      return res.status(500).json({ error: msg });
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
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const updateData = { ...req.body };
    const uid = req.userId!;

    try {
      if (files) {
        if (files['avatar']?.[0]) {
          updateData.avatarUrl = await storeProfileImage(files['avatar'][0], 'avatar', uid);
        }
        if (files['cover']?.[0]) {
          updateData.coverUrl = await storeProfileImage(files['cover'][0], 'cover', uid);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Profil medyası yüklenemedi';
      return res.status(503).json({ error: message });
    }

    const result = await UpdateProfileHandler.execute(uid, updateData);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Profile updated successfully' });
  }

  static async getPublicProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const requesterId = req.userId; // may be undefined for unauthenticated requests
      const profile = await IdentityService.getPublicProfile(parseInt(id), requesterId);
      return res.json(profile);
    } catch (error: any) {
      return res.status(error.status || 500).json({ error: error.message });
    }
  }

  // ─── Block / Unblock ─────────────────────────────────────────────────────────
  static async toggleBlock(req: AuthenticatedRequest, res: Response) {
    try {
      const targetId = parseInt(req.params.id);
      const result = await IdentityService.toggleBlock(req.userId!, targetId);
      if (!result.success) return res.status(400).json({ error: result.error });
      return res.json(result.data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async isBlocked(req: AuthenticatedRequest, res: Response) {
    try {
      const targetId = parseInt(req.params.id);
      const status = await IdentityService.isBlocked(req.userId!, targetId);
      return res.json(status);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ─── Active Sessions ──────────────────────────────────────────────────────────
  static async getSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const sessions = await IdentityService.getActiveSessions(req.userId!);
      return res.json(sessions);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async terminateSession(req: AuthenticatedRequest, res: Response) {
    try {
      const sessionId = parseInt(req.params.sessionId);
      await IdentityService.terminateSession(req.userId!, sessionId);
      return res.json({ message: 'Session terminated' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ─── Privacy Settings ─────────────────────────────────────────────────────────
  static async updatePrivacy(req: AuthenticatedRequest, res: Response) {
    try {
      const { isPrivate, mutedWords } = req.body;
      const result = await IdentityService.updatePrivacySettings(req.userId!, { isPrivate, mutedWords });
      if (!result.success) return res.status(400).json({ error: result.error });
      return res.json({ message: 'Privacy settings updated' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ─── Deactivate Account ───────────────────────────────────────────────────────
  static async deactivateAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await IdentityService.deactivateAccount(req.userId!);
      if (!result.success) return res.status(400).json({ error: result.error });
      return res.json({ message: 'Account deactivated' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
