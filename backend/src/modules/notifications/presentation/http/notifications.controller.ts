import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../middleware/auth';
import { NotificationsService } from '../../infrastructure/notifications.service';

export class NotificationsController {
  static async list(req: AuthenticatedRequest, res: Response) {
    const limitRaw = String(req.query.limit || '');
    const offsetRaw = String(req.query.offset || '');
    const limit = Math.min(Math.max(parseInt(limitRaw || '30', 10) || 30, 1), 100);
    const offset = Math.max(parseInt(offsetRaw || '0', 10) || 0, 0);
    const out = await NotificationsService.listForUser(req.userId!, { limit, offset });
    return res.json(out);
  }

  static async unreadCount(req: AuthenticatedRequest, res: Response) {
    const out = await NotificationsService.getUnreadCount(req.userId!);
    return res.json(out);
  }

  static async markRead(req: AuthenticatedRequest, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid notification id' });
    const out = await NotificationsService.markRead(req.userId!, id);
    return res.json(out);
  }

  static async readAll(req: AuthenticatedRequest, res: Response) {
    const out = await NotificationsService.markAllRead(req.userId!);
    return res.json(out);
  }

  static async readTab(req: AuthenticatedRequest, res: Response) {
    const scope = String((req.body as any)?.scope || '');
    if (!['personal', 'academic', 'community'].includes(scope)) {
      return res.status(400).json({ error: 'scope must be personal, academic, or community' });
    }
    const out = await NotificationsService.markTabRead(req.userId!, scope as 'personal' | 'academic' | 'community');
    return res.json(out);
  }

  static async bulkDelete(req: AuthenticatedRequest, res: Response) {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : undefined;
    const before = typeof req.body?.before === 'string' ? req.body.before : undefined;
    const out = await NotificationsService.bulkDelete(req.userId!, { ids, before });
    return res.json(out);
  }

  static async getPreferences(req: AuthenticatedRequest, res: Response) {
    const out = await NotificationsService.getPreferences(req.userId!);
    return res.json(out);
  }

  static async updatePreferences(req: AuthenticatedRequest, res: Response) {
    const prefs = (req.body?.prefs || {}) as Record<string, boolean>;
    const out = await NotificationsService.updatePreferences(req.userId!, prefs);
    return res.json(out);
  }
}

