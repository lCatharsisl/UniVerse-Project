import { query } from '../../../config/db';

export type PushSubscriptionRow = {
  id: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export class PushSubscriptionRepository {
  static async upsert(
    userId: number,
    endpoint: string,
    p256dh: string,
    auth: string,
    userAgent: string | null
  ): Promise<void> {
    await query(
      `
      INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, last_used_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        last_used_at = NOW()
      `,
      [userId, endpoint, p256dh, auth, userAgent]
    );
  }

  static async deleteByEndpoint(endpoint: string): Promise<void> {
    await query(`DELETE FROM public.push_subscriptions WHERE endpoint = $1`, [endpoint]);
  }

  static async deleteByEndpointForUser(userId: number, endpoint: string): Promise<void> {
    await query(`DELETE FROM public.push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [userId, endpoint]);
  }

  static async deleteAllForUser(userId: number): Promise<void> {
    await query(`DELETE FROM public.push_subscriptions WHERE user_id = $1`, [userId]);
  }

  static async byUserIds(userIds: number[]): Promise<PushSubscriptionRow[]> {
    if (!userIds.length) return [];
    return query<PushSubscriptionRow>(
      `SELECT id, user_id, endpoint, p256dh, auth FROM public.push_subscriptions WHERE user_id = ANY($1::int[])`,
      [userIds]
    );
  }
}
