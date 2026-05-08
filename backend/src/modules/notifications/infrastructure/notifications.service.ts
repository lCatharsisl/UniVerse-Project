import { query, queryOne } from '../../../config/db';
import { AppError } from '../../../shared/core/errors';

type ListOptions = {
  limit: number;
  offset: number;
  /** UI sekmesi; verilmezse eski davranış (mesaj hariç tümü). */
  scope?: 'personal' | 'academic' | 'community';
};

export type NotificationRow = {
  notification_id: number;
  recipient_user_id: number;
  actor_user_id: number | null;
  actor_email: string | null;
  actor_name: string | null;
  actor_surname: string | null;
  actor_avatar_url: string | null;
  community_id: number | null;
  source_module: string;
  kind: string;
  title: string | null;
  message: string | null;
  entity_type: string | null;
  entity_id: number | null;
  payload: any;
  is_read: boolean;
  created_at: string;
};

export class NotificationsService {
  static async listForUser(userId: number, opts: ListOptions) {
    const scope = opts.scope ?? null;
    const scopeSqlList = `
      AND (
        $4::text IS NULL
        OR ($4::text = 'academic' AND n.source_module = 'academic')
        OR ($4::text = 'community' AND n.source_module = 'community')
        OR (
          $4::text = 'personal'
          AND n.source_module IS DISTINCT FROM 'academic'
          AND n.source_module IS DISTINCT FROM 'community'
        )
      )`;
    const scopeSqlCount = `
      AND (
        $2::text IS NULL
        OR ($2::text = 'academic' AND n.source_module = 'academic')
        OR ($2::text = 'community' AND n.source_module = 'community')
        OR (
          $2::text = 'personal'
          AND n.source_module IS DISTINCT FROM 'academic'
          AND n.source_module IS DISTINCT FROM 'community'
        )
      )`;

    const items = await query<NotificationRow>(
      `
      SELECT
        n.notification_id,
        n.recipient_user_id,
        n.actor_user_id,
        u.email AS actor_email,
        COALESCE(st.student_name, sf.staff_name, a.admin_name, c.community_name) AS actor_name,
        COALESCE(st.student_surname, sf.staff_surname, a.admin_surname, '') AS actor_surname,
        COALESCE(st.avatar_url, sf.avatar_url, a.avatar_url, c.avatar_url) AS actor_avatar_url,
        n.community_id,
        n.source_module,
        n.kind,
        n.title,
        n.message,
        n.entity_type,
        n.entity_id,
        n.payload,
        n.is_read,
        n.created_at
      FROM public.notifications n
      LEFT JOIN public.users u ON u.user_id = n.actor_user_id
      LEFT JOIN public.students st ON st.user_id = u.user_id
      LEFT JOIN public.staff sf ON sf.user_id = u.user_id
      LEFT JOIN public.admins a ON a.user_id = u.user_id
      LEFT JOIN public.communities c ON c.user_id = u.user_id
      WHERE n.recipient_user_id = $1
        AND n.source_module IS DISTINCT FROM 'messaging'
        ${scopeSqlList}
      ORDER BY n.created_at DESC, n.notification_id DESC
      LIMIT $2 OFFSET $3
      `,
      [userId, opts.limit, opts.offset, scope]
    );

    const totalRow = await queryOne<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM public.notifications n
       WHERE n.recipient_user_id = $1
         AND n.source_module IS DISTINCT FROM 'messaging'
         ${scopeSqlCount}`,
      [userId, scope]
    );

    const total = parseInt(totalRow?.total || '0', 10);
    return { items, total };
  }

  static async getUnreadCount(userId: number) {
    const row = await queryOne<{
      count: string;
      personal: string;
      academic: string;
      community: string;
    }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE NOT is_read AND source_module IS DISTINCT FROM 'messaging')::text AS count,
        COUNT(*) FILTER (
          WHERE NOT is_read
            AND source_module IS DISTINCT FROM 'messaging'
            AND source_module IS DISTINCT FROM 'academic'
            AND source_module IS DISTINCT FROM 'community'
        )::text AS personal,
        COUNT(*) FILTER (WHERE NOT is_read AND source_module = 'academic')::text AS academic,
        COUNT(*) FILTER (WHERE NOT is_read AND source_module = 'community')::text AS community
      FROM public.notifications
      WHERE recipient_user_id = $1
      `,
      [userId]
    );
    return {
      count: parseInt(row?.count || '0', 10),
      byScope: {
        personal: parseInt(row?.personal || '0', 10),
        academic: parseInt(row?.academic || '0', 10),
        community: parseInt(row?.community || '0', 10),
      },
    };
  }

  static async markRead(userId: number, notificationId: number) {
    const updated = await queryOne<{ notification_id: number }>(
      `
      UPDATE public.notifications
      SET is_read = true
      WHERE notification_id = $1 AND recipient_user_id = $2
      RETURNING notification_id
      `,
      [notificationId, userId]
    );
    if (!updated) throw AppError.notFound('Notification not found');
    return { success: true };
  }

  static async markAllRead(userId: number) {
    await query(
      `
      UPDATE public.notifications
      SET is_read = true
      WHERE recipient_user_id = $1 AND is_read = false
      `,
      [userId]
    );
    return { success: true };
  }

  /** personal = everything except academic & community modules */
  static async markTabRead(userId: number, scope: 'personal' | 'academic' | 'community') {
    await query(
      `
      UPDATE public.notifications
      SET is_read = true
      WHERE recipient_user_id = $1
        AND is_read = false
        AND (
          ($2::text = 'academic' AND source_module = 'academic')
          OR ($2::text = 'community' AND source_module = 'community')
          OR (
            $2::text = 'personal'
            AND source_module IS NOT NULL
            AND source_module NOT IN ('academic', 'community', 'messaging')
          )
        )
      `,
      [userId, scope]
    );
    return { success: true };
  }

  static async bulkDelete(userId: number, input: { ids?: number[]; before?: string }) {
    const ids = (input.ids || []).filter((x) => Number.isFinite(x));
    const before = input.before ? new Date(input.before) : null;

    if (before && Number.isNaN(before.getTime())) {
      throw AppError.badRequest('Invalid before datetime');
    }
    if (!ids.length && !before) {
      throw AppError.badRequest('ids or before is required');
    }

    if (ids.length) {
      await query(
        `
        DELETE FROM public.notifications
        WHERE recipient_user_id = $1
          AND notification_id = ANY($2::int[])
        `,
        [userId, ids]
      );
    }

    if (before) {
      await query(
        `
        DELETE FROM public.notifications
        WHERE recipient_user_id = $1
          AND created_at < $2::timestamptz
        `,
        [userId, before.toISOString()]
      );
    }

    return { success: true };
  }

  static async getPreferences(userId: number) {
    const row = await queryOne<{ prefs: any }>(
      `SELECT prefs FROM public.notification_preferences WHERE user_id = $1`,
      [userId]
    );
    return { prefs: (row?.prefs || {}) as Record<string, boolean> };
  }

  static async updatePreferences(userId: number, prefs: Record<string, boolean>) {
    const safe: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(prefs || {})) {
      const key = String(k).trim();
      if (!key) continue;
      safe[key] = Boolean(v);
    }

    await query(
      `
      INSERT INTO public.notification_preferences (user_id, prefs, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET prefs = EXCLUDED.prefs, updated_at = NOW()
      `,
      [userId, JSON.stringify(safe)]
    );

    return { success: true, prefs: safe };
  }
}

