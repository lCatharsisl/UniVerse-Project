import { query, queryOne } from '../../../config/db';

export type CreateNotificationInput = {
  recipientUserId: number;
  actorUserId?: number | null;
  communityId?: number | null;
  sourceModule: 'social' | 'academic' | 'community' | 'messaging' | 'system';
  kind: string;
  title?: string | null;
  message?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  payload?: any;
};

export class NotificationEmitterService {
  static async isEnabledForUser(userId: number, kind: string): Promise<boolean> {
    const row = await queryOne<{ enabled: boolean | null }>(
      `
      SELECT
        CASE
          WHEN np.prefs ? $2 THEN COALESCE((np.prefs ->> $2)::boolean, true)
          ELSE true
        END AS enabled
      FROM public.notification_preferences np
      WHERE np.user_id = $1
      `,
      [userId, kind]
    );
    return row?.enabled ?? true;
  }

  static async create(input: CreateNotificationInput): Promise<void> {
    const recipientUserId = input.recipientUserId;
    const actorUserId = input.actorUserId ?? null;

    if (!recipientUserId || !Number.isInteger(recipientUserId)) return;
    if (actorUserId && actorUserId === recipientUserId) return;

    const enabled = await this.isEnabledForUser(recipientUserId, input.kind);
    if (!enabled) return;

    await query(
      `
      INSERT INTO public.notifications
        (recipient_user_id, actor_user_id, community_id, source_module, kind, title, message, entity_type, entity_id, payload, is_read)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, false)
      `,
      [
        recipientUserId,
        actorUserId,
        input.communityId ?? null,
        input.sourceModule,
        input.kind,
        input.title ?? null,
        input.message ?? null,
        input.entityType ?? null,
        input.entityId ?? null,
        JSON.stringify(input.payload || {}),
      ]
    );
  }

  static async createForRecipientsBulk(opts: {
    recipientUserIds: number[];
    actorUserId?: number | null;
    communityId?: number | null;
    sourceModule: CreateNotificationInput['sourceModule'];
    kind: string;
    title?: string | null;
    message?: string | null;
    entityType?: string | null;
    entityId?: number | null;
    payload?: any;
  }): Promise<void> {
    const ids = Array.from(new Set((opts.recipientUserIds || []).filter((x) => Number.isInteger(x) && x > 0)));
    const actorUserId = opts.actorUserId ?? null;
    const filtered = actorUserId ? ids.filter((id) => id !== actorUserId) : ids;
    if (!filtered.length) return;

    await query(
      `
      INSERT INTO public.notifications
        (recipient_user_id, actor_user_id, community_id, source_module, kind, title, message, entity_type, entity_id, payload, is_read)
      SELECT
        u.user_id,
        $2::int,
        $3::int,
        $4::varchar,
        $5::varchar,
        $6::text,
        $7::text,
        $8::varchar,
        $9::int,
        $10::jsonb,
        false
      FROM (
        SELECT UNNEST($1::int[]) AS user_id
      ) u
      LEFT JOIN public.notification_preferences np
        ON np.user_id = u.user_id
      WHERE COALESCE((np.prefs ->> $5)::boolean, true) = true
      `,
      [
        filtered,
        actorUserId,
        opts.communityId ?? null,
        opts.sourceModule,
        opts.kind,
        opts.title ?? null,
        opts.message ?? null,
        opts.entityType ?? null,
        opts.entityId ?? null,
        JSON.stringify(opts.payload || {}),
      ]
    );
  }

  /** Like create, but never throws — avoids breaking likes/messages if DB migration is missing. */
  static async createSafe(input: CreateNotificationInput): Promise<void> {
    try {
      await this.create(input);
    } catch (e: any) {
      console.error('[NotificationEmitter] create failed:', input.kind, e?.message || e);
    }
  }

  static async createForRecipientsBulkSafe(
    opts: {
      recipientUserIds: number[];
      actorUserId?: number | null;
      communityId?: number | null;
      sourceModule: CreateNotificationInput['sourceModule'];
      kind: string;
      title?: string | null;
      message?: string | null;
      entityType?: string | null;
      entityId?: number | null;
      payload?: any;
    }
  ): Promise<void> {
    try {
      await this.createForRecipientsBulk(opts);
    } catch (e: any) {
      console.error('[NotificationEmitter] bulk create failed:', opts.kind, e?.message || e);
    }
  }
}

