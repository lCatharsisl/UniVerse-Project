import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../middleware/auth';
import { NotificationsService } from '../../infrastructure/notifications.service';
import { PushSubscriptionRepository } from '../../infrastructure/pushSubscription.repository';
import { WebPushDispatchService } from '../../infrastructure/webPush.dispatch.service';

export class NotificationsController {
  private static pgErrCode(err: unknown): string | undefined {
    if (err && typeof err === 'object' && 'code' in err) {
      const c = (err as { code: unknown }).code;
      return typeof c === 'string' ? c : undefined;
    }
    return undefined;
  }

  static async list(req: AuthenticatedRequest, res: Response) {
    const q = req.query as { limit?: string; offset?: string; scope?: string };
    const limitRaw = String(q.limit || '');
    const offsetRaw = String(q.offset || '');
    const limit = Math.min(Math.max(parseInt(limitRaw || '30', 10) || 30, 1), 100);
    const offset = Math.max(parseInt(offsetRaw || '0', 10) || 0, 0);
    const scopeRaw = q.scope;
    const scope =
      scopeRaw === 'personal' || scopeRaw === 'academic' || scopeRaw === 'community' ? scopeRaw : undefined;
    const out = await NotificationsService.listForUser(req.userId!, { limit, offset, scope });
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

  static async pushPublicKey(_req: AuthenticatedRequest, res: Response) {
    const publicKey = WebPushDispatchService.getPublicKey();
    return res.json({ publicKey });
  }

  static async pushSubscribe(req: AuthenticatedRequest, res: Response) {
    const sub = (req.body as { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } })
      ?.subscription;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'Invalid subscription payload' });
    }
    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;
    try {
      await PushSubscriptionRepository.upsert(req.userId!, endpoint, p256dh, auth, ua);
      return res.json({ success: true });
    } catch (err: unknown) {
      if (NotificationsController.pgErrCode(err) === '42P01') {
        console.warn('[notifications] push_subscriptions tablosu yok — `cd backend && npm run push:migrate`');
        return res.json({ success: true, skipped: true });
      }
      const msg = err instanceof Error ? err.message : 'Push subscribe failed';
      console.error('[notifications] pushSubscribe', err);
      return res.status(500).json({ error: msg });
    }
  }

  static async pushUnsubscribe(req: AuthenticatedRequest, res: Response) {
    const endpoint = String((req.body as { endpoint?: string })?.endpoint || '');
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    try {
      await PushSubscriptionRepository.deleteByEndpointForUser(req.userId!, endpoint);
      return res.json({ success: true });
    } catch (err: unknown) {
      if (NotificationsController.pgErrCode(err) === '42P01') {
        console.warn('[notifications] push_subscriptions tablosu yok — `cd backend && npm run push:migrate`');
        return res.json({ success: true, skipped: true });
      }
      const msg = err instanceof Error ? err.message : 'Push unsubscribe failed';
      console.error('[notifications] pushUnsubscribe', err);
      return res.status(500).json({ error: msg });
    }
  }

  static async pushUnsubscribeAll(req: AuthenticatedRequest, res: Response) {
    try {
      await PushSubscriptionRepository.deleteAllForUser(req.userId!);
      return res.json({ success: true });
    } catch (err: unknown) {
      if (NotificationsController.pgErrCode(err) === '42P01') {
        console.warn('[notifications] push_subscriptions tablosu yok — `cd backend && npm run push:migrate`');
        return res.json({ success: true, skipped: true });
      }
      const msg = err instanceof Error ? err.message : 'Push unsubscribe failed';
      console.error('[notifications] pushUnsubscribeAll', err);
      return res.status(500).json({ error: msg });
    }
  }
}

