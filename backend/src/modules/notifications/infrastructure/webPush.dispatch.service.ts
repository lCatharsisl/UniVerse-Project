import webpush from 'web-push';
import env from '../../../config/env';
import { PushSubscriptionRepository, type PushSubscriptionRow } from './pushSubscription.repository';

let vapidConfigured = false;

function ensureVapid(): boolean {
  const pub = env.VAPID_PUBLIC_KEY;
  const priv = env.VAPID_PRIVATE_KEY;
  const subj = env.VAPID_SUBJECT;
  if (!pub || !priv || !subj) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(subj, pub, priv);
    vapidConfigured = true;
  }
  return true;
}

function frontendBase(): string {
  return (env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function notificationsUrl(): string {
  return `${frontendBase()}/notifications`;
}

function messagingDmUrl(actorUserId: number): string {
  return `${frontendBase()}/messages?dm=${actorUserId}`;
}

export class WebPushDispatchService {
  static isEnabled(): boolean {
    return !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
  }

  static getPublicKey(): string | null {
    return env.VAPID_PUBLIC_KEY ?? null;
  }

  static async afterSingleNotification(
    recipientUserId: number,
    notificationId: number,
    meta: {
      title?: string | null;
      message?: string | null;
      kind: string;
      sourceModule: string;
      actorUserId?: number | null;
    }
  ): Promise<void> {
    if (!ensureVapid()) return;
    const title = String(meta.title?.trim() || meta.kind || 'UniVerse').slice(0, 120);
    const body = String(meta.message?.trim() || meta.title?.trim() || 'New notification').slice(0, 500);
    const openUrl =
      meta.sourceModule === 'messaging' && meta.actorUserId && Number.isInteger(meta.actorUserId)
        ? messagingDmUrl(meta.actorUserId)
        : notificationsUrl();
    const payload = JSON.stringify({
      title,
      body,
      tag: `notification-${notificationId}`,
      notificationId,
      url: openUrl,
      sourceModule: meta.sourceModule,
    });
    const subs = await PushSubscriptionRepository.byUserIds([recipientUserId]);
    for (const s of subs) {
      await WebPushDispatchService.sendOne(s, payload);
    }
  }

  static async afterBulkRecipients(
    recipientUserIds: number[],
    meta: { title?: string | null; message?: string | null; kind: string; sourceModule: string }
  ): Promise<void> {
    if (!ensureVapid() || !recipientUserIds.length) return;
    const title = String(meta.title?.trim() || meta.kind || 'UniVerse').slice(0, 120);
    const body = String(meta.message?.trim() || meta.title?.trim() || 'New notification').slice(0, 500);
    const uniq = Array.from(new Set(recipientUserIds.filter((x) => Number.isInteger(x) && x > 0)));
    const subs = await PushSubscriptionRepository.byUserIds(uniq);
    const base = Date.now();
    const bulkOpenUrl = meta.sourceModule === 'messaging' ? `${frontendBase()}/messages` : notificationsUrl();
    for (const s of subs) {
      const payload = JSON.stringify({
        title,
        body,
        tag: `bulk-${meta.kind}-${base}-u${s.user_id}-s${s.id}`,
        url: bulkOpenUrl,
        sourceModule: meta.sourceModule,
      });
      await WebPushDispatchService.sendOne(s, payload);
    }
  }

  private static async sendOne(sub: PushSubscriptionRow, payload: string): Promise<void> {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 3600 }
      );
    } catch (e: unknown) {
      const err = e as { statusCode?: number; message?: string };
      const status = err?.statusCode;
      if (status === 404 || status === 410) {
        await PushSubscriptionRepository.deleteByEndpoint(sub.endpoint).catch(() => {});
      } else {
        console.warn('[WebPush] send failed', status, err?.message || e);
      }
    }
  }
}
