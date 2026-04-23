import { query, queryOne, transaction } from '../../../config/db';
import { storeMessagingImage } from '../../../integrations/messagingStorage';
import { AppError } from '../../../shared/core/errors';
import { IdentityService } from '../../identity/infrastructure/identity.service';

type ConversationMember = {
  userId: number;
  role?: 'owner' | 'admin' | 'member';
};

export class MessagingService {
  static async searchUsers(currentUserId: number, q: string, limit = 20) {
    const rows = await query<any>(
      `
      SELECT
        u.user_id,
        u.email,
        u.role,
        COALESCE(st.student_name, sf.staff_name, a.admin_name, c.community_name, u.email) AS first_name,
        COALESCE(st.student_surname, sf.staff_surname, a.admin_surname, '') AS last_name,
        COALESCE(st.avatar_url, sf.avatar_url, a.avatar_url, c.avatar_url) AS avatar_url
      FROM users u
      LEFT JOIN students st ON st.user_id = u.user_id
      LEFT JOIN staff sf ON sf.user_id = u.user_id
      LEFT JOIN admins a ON a.user_id = u.user_id
      LEFT JOIN communities c ON c.user_id = u.user_id
      WHERE u.user_id <> $1
        AND u.is_active = true
        AND COALESCE(u.has_completed_login, false) = true
        AND (
          u.email ILIKE $2
          OR COALESCE(st.student_name, sf.staff_name, a.admin_name, c.community_name, '') ILIKE $2
          OR COALESCE(st.student_surname, sf.staff_surname, a.admin_surname, '') ILIKE $2
        )
        AND NOT EXISTS (
          SELECT 1
          FROM blocked_users b
          WHERE (b.blocker_id = $1 AND b.blocked_id = u.user_id)
             OR (b.blocker_id = u.user_id AND b.blocked_id = $1)
        )
      ORDER BY first_name ASC
      LIMIT $3
      `,
      [currentUserId, `%${q}%`, limit]
    );
    return rows;
  }

  static async createConversation(currentUserId: number, title: string | null, participantIds: number[], isGroup: boolean) {
    const cleanIds = Array.from(new Set(participantIds.filter((id) => Number.isInteger(id) && id > 0 && id !== currentUserId)));
    if (!isGroup && cleanIds.length !== 1) throw AppError.badRequest('Direct conversation requires exactly one target user');
    if (isGroup && cleanIds.length < 2) throw AppError.badRequest('Group conversation requires at least two participants');

    for (const targetId of cleanIds) {
      const blocked = await IdentityService.isBlocked(currentUserId, targetId);
      if (blocked.isBlocked || blocked.blockedByTarget) {
        throw AppError.forbidden('Cannot start conversation with blocked user');
      }
    }
    await IdentityService.assertChatEligibleUserIds(cleanIds);

    if (!isGroup) {
      const targetId = cleanIds[0];
      const dmConversationId = await transaction(async (client) => {
        await client.query(
          `SELECT pg_advisory_xact_lock(LEAST($1::int, $2::int), GREATEST($1::int, $2::int))`,
          [currentUserId, targetId]
        );

        const existingRes = await client.query<{ conversation_id: number }>(
          `
          SELECT cp1.conversation_id
          FROM conversation_participants cp1
          JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
          JOIN conversations c ON c.conversation_id = cp1.conversation_id
          WHERE c.is_group = false
            AND cp1.user_id = $1 AND cp1.is_active = true
            AND cp2.user_id = $2 AND cp2.is_active = true
          ORDER BY c.conversation_id ASC
          LIMIT 1
          `,
          [currentUserId, targetId]
        );

        if (existingRes.rows[0]) {
          return existingRes.rows[0].conversation_id as number;
        }

        const conversation = await client.query(
          `
          INSERT INTO conversations (is_group, title, created_by_user_id)
          VALUES ($1, $2, $3)
          RETURNING conversation_id
          `,
          [false, title || null, currentUserId]
        );
        const conversationId = conversation.rows[0].conversation_id as number;

        const members: ConversationMember[] = [
          { userId: currentUserId, role: 'owner' },
          { userId: targetId, role: 'member' },
        ];
        for (const member of members) {
          await client.query(
            `
            INSERT INTO conversation_participants (conversation_id, user_id, role, is_active)
            VALUES ($1, $2, $3, true)
            ON CONFLICT (conversation_id, user_id)
            DO UPDATE SET is_active = true, left_at = NULL
            `,
            [conversationId, member.userId, member.role || 'member']
          );
        }

        return conversationId;
      });

      return this.getConversationById(dmConversationId, currentUserId);
    }

    const createdConversationId = await transaction(async (client) => {
      const conversation = await client.query(
        `
        INSERT INTO conversations (is_group, title, created_by_user_id)
        VALUES ($1, $2, $3)
        RETURNING conversation_id
        `,
        [isGroup, title || null, currentUserId]
      );
      const conversationId = conversation.rows[0].conversation_id as number;

      const members: ConversationMember[] = [{ userId: currentUserId, role: 'owner' }, ...cleanIds.map((id) => ({ userId: id, role: 'member' as const }))];
      for (const member of members) {
        await client.query(
          `
          INSERT INTO conversation_participants (conversation_id, user_id, role, is_active)
          VALUES ($1, $2, $3, true)
          ON CONFLICT (conversation_id, user_id)
          DO UPDATE SET is_active = true, left_at = NULL
          `,
          [conversationId, member.userId, member.role || 'member']
        );
      }

      return conversationId;
    });

    return this.getConversationById(createdConversationId, currentUserId);
  }

  static async listConversations(userId: number) {
    const rows = await query<any>(
      `
      SELECT
        c.conversation_id,
        c.is_group,
        c.title,
        c.updated_at,
        lm.message_id AS last_message_id,
        lm.content AS last_message_content,
        lm.message_type AS last_message_type,
        lm.created_at AS last_message_created_at,
        lm.sender_user_id AS last_message_sender_user_id,
        cp.last_read_message_id,
        COALESCE(cp.notifications_muted, false) AS notifications_muted,
        (
          SELECT COUNT(*)::int
          FROM messages m
          WHERE m.conversation_id = c.conversation_id
            AND (cp.last_read_message_id IS NULL OR m.message_id > cp.last_read_message_id)
            AND m.sender_user_id <> $1
            AND m.deleted_at IS NULL
        ) AS unread_count
      FROM conversation_participants cp
      JOIN conversations c ON c.conversation_id = cp.conversation_id
      LEFT JOIN messages lm ON lm.message_id = c.last_message_id
      WHERE cp.user_id = $1 AND cp.is_active = true
      ORDER BY c.updated_at DESC
      `,
      [userId]
    );

    const convIds = rows.map((r) => r.conversation_id);
    const members = convIds.length
      ? await query<any>(
          `
          SELECT DISTINCT ON (cp.conversation_id, cp.user_id)
            cp.conversation_id,
            cp.user_id,
            cp.role,
            cp.last_read_message_id,
            COALESCE(st.student_name, sf.staff_name, a.admin_name, c.community_name, u.email) AS first_name,
            COALESCE(st.student_surname, sf.staff_surname, a.admin_surname, '') AS last_name,
            COALESCE(st.avatar_url, sf.avatar_url, a.avatar_url, c.avatar_url) AS avatar_url
          FROM conversation_participants cp
          JOIN users u ON u.user_id = cp.user_id
          LEFT JOIN students st ON st.user_id = u.user_id
          LEFT JOIN staff sf ON sf.user_id = u.user_id
          LEFT JOIN admins a ON a.user_id = u.user_id
          LEFT JOIN communities c ON c.user_id = u.user_id
          WHERE cp.conversation_id = ANY($1::int[])
            AND cp.is_active = true
          ORDER BY cp.conversation_id, cp.user_id, cp.joined_at ASC
          `,
          [convIds]
        )
      : [];

    const membersByConversation = new Map<number, any[]>();
    for (const member of members) {
      const bucket = membersByConversation.get(member.conversation_id);
      if (bucket) bucket.push(member);
      else membersByConversation.set(member.conversation_id, [member]);
    }

    const enriched = rows.map((row) => ({
      ...row,
      members: membersByConversation.get(row.conversation_id) || [],
    }));

    const deduped: typeof enriched = [];
    const dmPeerSeen = new Set<number>();
    for (const c of enriched) {
      if (c.is_group) {
        deduped.push(c);
        continue;
      }
      const otherUserId = c.members.find((m: { user_id: number }) => m.user_id !== userId)?.user_id;
      if (otherUserId == null) {
        deduped.push(c);
        continue;
      }
      if (dmPeerSeen.has(otherUserId)) continue;
      dmPeerSeen.add(otherUserId);
      deduped.push(c);
    }

    return deduped;
  }

  static async getUnreadCount(userId: number) {
    const row = await queryOne<{ count: string }>(
      `
      SELECT COALESCE(SUM(unread_count), 0)::text AS count
      FROM (
        SELECT
          (
            SELECT COUNT(*)::int
            FROM messages m
            WHERE m.conversation_id = c.conversation_id
              AND (cp.last_read_message_id IS NULL OR m.message_id > cp.last_read_message_id)
              AND m.sender_user_id <> $1
              AND m.deleted_at IS NULL
          ) AS unread_count
        FROM conversation_participants cp
        JOIN conversations c ON c.conversation_id = cp.conversation_id
        WHERE cp.user_id = $1
          AND cp.is_active = true
      ) unread
      `,
      [userId]
    );
    return { count: parseInt(row?.count || '0', 10) };
  }

  static async getConversationMessages(
    conversationId: number,
    userId: number,
    limit = 50,
    offset = 0,
    anchorMessageId?: number
  ) {
    await this.ensureParticipant(conversationId, userId);
    let items: any[];
    if (anchorMessageId != null) {
      const anchorRow = await queryOne<{ message_id: number }>(
        `
        SELECT message_id
        FROM messages
        WHERE message_id = $1 AND conversation_id = $2 AND deleted_at IS NULL
        `,
        [anchorMessageId, conversationId]
      );
      if (!anchorRow) throw AppError.notFound('Message not found in this conversation');
      items = await query<any>(
        `
        SELECT
          m.message_id,
          m.conversation_id,
          m.sender_user_id,
          m.content,
          m.message_type,
          m.created_at,
          COALESCE(st.student_name, sf.staff_name, a.admin_name, c.community_name, u.email) AS sender_first_name,
          COALESCE(st.student_surname, sf.staff_surname, a.admin_surname, '') AS sender_last_name,
          COALESCE(st.avatar_url, sf.avatar_url, a.avatar_url, c.avatar_url) AS sender_avatar_url
        FROM messages m
        JOIN users u ON u.user_id = m.sender_user_id
        LEFT JOIN students st ON st.user_id = u.user_id
        LEFT JOIN staff sf ON sf.user_id = u.user_id
        LEFT JOIN admins a ON a.user_id = u.user_id
        LEFT JOIN communities c ON c.user_id = u.user_id
        WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
          AND m.message_id <= $4
        ORDER BY m.message_id DESC
        LIMIT $2 OFFSET $3
        `,
        [conversationId, limit, offset, anchorMessageId]
      );
    } else {
      items = await query<any>(
        `
        SELECT
          m.message_id,
          m.conversation_id,
          m.sender_user_id,
          m.content,
          m.message_type,
          m.created_at,
          COALESCE(st.student_name, sf.staff_name, a.admin_name, c.community_name, u.email) AS sender_first_name,
          COALESCE(st.student_surname, sf.staff_surname, a.admin_surname, '') AS sender_last_name,
          COALESCE(st.avatar_url, sf.avatar_url, a.avatar_url, c.avatar_url) AS sender_avatar_url
        FROM messages m
        JOIN users u ON u.user_id = m.sender_user_id
        LEFT JOIN students st ON st.user_id = u.user_id
        LEFT JOIN staff sf ON sf.user_id = u.user_id
        LEFT JOIN admins a ON a.user_id = u.user_id
        LEFT JOIN communities c ON c.user_id = u.user_id
        WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [conversationId, limit, offset]
      );
    }
    const messageIds = items.map((m) => m.message_id);
    const attachments = messageIds.length
      ? await query<any>(
          `
          SELECT attachment_id, message_id, file_url, file_type, mime_type, file_size
          FROM message_attachments
          WHERE message_id = ANY($1::int[])
          ORDER BY attachment_id ASC
          `,
          [messageIds]
        )
      : [];

    const attachmentsByMessageId = new Map<number, any[]>();
    for (const attachment of attachments) {
      const bucket = attachmentsByMessageId.get(attachment.message_id);
      if (bucket) bucket.push(attachment);
      else attachmentsByMessageId.set(attachment.message_id, [attachment]);
    }

    return items
      .map((m) => ({ ...m, attachments: attachmentsByMessageId.get(m.message_id) || [] }))
      .reverse();
  }

  static async searchMessagesInConversation(
    conversationId: number,
    userId: number,
    q: string,
    limit = 30,
    offset = 0
  ) {
    await this.ensureParticipant(conversationId, userId);
    if (!q.trim()) throw AppError.badRequest('q is required');
    const items = await query<any>(
      `
      SELECT
        m.message_id,
        m.conversation_id,
        m.sender_user_id,
        m.content,
        m.message_type,
        m.created_at,
        COALESCE(st.student_name, sf.staff_name, a.admin_name, c.community_name, u.email) AS sender_first_name,
        COALESCE(st.student_surname, sf.staff_surname, a.admin_surname, '') AS sender_last_name,
        COALESCE(st.avatar_url, sf.avatar_url, a.avatar_url, c.avatar_url) AS sender_avatar_url
      FROM messages m
      JOIN users u ON u.user_id = m.sender_user_id
      LEFT JOIN students st ON st.user_id = u.user_id
      LEFT JOIN staff sf ON sf.user_id = u.user_id
      LEFT JOIN admins a ON a.user_id = u.user_id
      LEFT JOIN communities c ON c.user_id = u.user_id
      WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
        AND position(lower($2) in lower(COALESCE(m.content, ''))) > 0
      ORDER BY m.message_id DESC
      LIMIT $3 OFFSET $4
      `,
      [conversationId, q, limit, offset]
    );
    const messageIds = items.map((m) => m.message_id);
    const attachments = messageIds.length
      ? await query<any>(
          `
          SELECT attachment_id, message_id, file_url, file_type, mime_type, file_size
          FROM message_attachments
          WHERE message_id = ANY($1::int[])
          ORDER BY attachment_id ASC
          `,
          [messageIds]
        )
      : [];
    const attachmentsByMessageId = new Map<number, any[]>();
    for (const attachment of attachments) {
      const bucket = attachmentsByMessageId.get(attachment.message_id);
      if (bucket) bucket.push(attachment);
      else attachmentsByMessageId.set(attachment.message_id, [attachment]);
    }
    // Newest matches first (items are already message_id DESC)
    return items.map((m) => ({ ...m, attachments: attachmentsByMessageId.get(m.message_id) || [] }));
  }

  private static extractUrlsFromText(text: string | null | undefined): string[] {
    if (!text) return [];
    const re = /https?:\/\/[^\s<>"'{}|\\^`[\])]+/gi;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const m of text.matchAll(re)) {
      const u = m[0].replace(/[.,;:!?)]+$/, '');
      if (u.length < 5) continue;
      if (!seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    }
    return out;
  }

  static async getSharedConversationContent(
    conversationId: number,
    userId: number,
    limit = 60,
    offset = 0
  ) {
    await this.ensureParticipant(conversationId, userId);
    const attachmentRows = await query<any>(
      `
      SELECT
        ma.attachment_id,
        ma.message_id,
        ma.file_url,
        ma.file_type,
        ma.mime_type,
        ma.file_size,
        m.created_at AS message_created_at,
        m.sender_user_id,
        COALESCE(st.student_name, sf.staff_name, a.admin_name, c.community_name, u.email) AS sender_first_name,
        COALESCE(st.student_surname, sf.staff_surname, a.admin_surname, '') AS sender_last_name
      FROM message_attachments ma
      JOIN messages m ON m.message_id = ma.message_id
      JOIN users u ON u.user_id = m.sender_user_id
      LEFT JOIN students st ON st.user_id = u.user_id
      LEFT JOIN staff sf ON sf.user_id = u.user_id
      LEFT JOIN admins a ON a.user_id = u.user_id
      LEFT JOIN communities c ON c.user_id = u.user_id
      WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
      ORDER BY m.message_id DESC, ma.attachment_id DESC
      LIMIT $2 OFFSET $3
      `,
      [conversationId, limit, offset]
    );

    const linkMessageRows = await query<any>(
      `
      SELECT
        m.message_id,
        m.content,
        m.created_at,
        m.sender_user_id,
        COALESCE(st.student_name, sf.staff_name, a.admin_name, c.community_name, u.email) AS sender_first_name,
        COALESCE(st.student_surname, sf.staff_surname, a.admin_surname, '') AS sender_last_name
      FROM messages m
      JOIN users u ON u.user_id = m.sender_user_id
      LEFT JOIN students st ON st.user_id = u.user_id
      LEFT JOIN staff sf ON sf.user_id = u.user_id
      LEFT JOIN admins a ON a.user_id = u.user_id
      LEFT JOIN communities c ON c.user_id = u.user_id
      WHERE m.conversation_id = $1
        AND m.deleted_at IS NULL
        AND m.content IS NOT NULL
        AND m.content ~* 'https?://'
      ORDER BY m.message_id DESC
      LIMIT 400
      `,
      [conversationId]
    );

    const links: {
      url: string;
      message_id: number;
      created_at: string;
      sender_user_id: number;
      sender_first_name: string;
      sender_last_name: string;
    }[] = [];
    for (const row of linkMessageRows) {
      for (const url of this.extractUrlsFromText(row.content)) {
        links.push({
          url,
          message_id: row.message_id,
          created_at: row.created_at,
          sender_user_id: row.sender_user_id,
          sender_first_name: row.sender_first_name,
          sender_last_name: row.sender_last_name,
        });
      }
    }

    return {
      attachments: attachmentRows,
      links,
    };
  }

  static async setConversationNotificationsMuted(
    conversationId: number,
    userId: number,
    muted: boolean
  ) {
    await this.ensureParticipant(conversationId, userId);
    await query(
      `
      UPDATE conversation_participants
      SET notifications_muted = $1
      WHERE conversation_id = $2 AND user_id = $3 AND is_active = true
      `,
      [muted, conversationId, userId]
    );
    return { success: true, notifications_muted: muted };
  }

  static async sendMessage(
    conversationId: number,
    senderUserId: number,
    payload: { content?: string; files?: Express.Multer.File[] }
  ) {
    const participant = await this.ensureParticipant(conversationId, senderUserId);
    const files = payload.files || [];
    const content = (payload.content || '').trim();
    if (!content && files.length === 0) throw AppError.badRequest('Message content or image is required');

    const conversation = await queryOne<{ is_group: boolean }>(
      `SELECT is_group FROM conversations WHERE conversation_id = $1`,
      [conversationId]
    );
    if (!conversation) throw AppError.notFound('Conversation not found');

    if (!conversation.is_group) {
      const target = await queryOne<{ user_id: number }>(
        `SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id <> $2 AND is_active = true LIMIT 1`,
        [conversationId, senderUserId]
      );
      if (target) {
        const blocked = await IdentityService.isBlocked(senderUserId, target.user_id);
        if (blocked.isBlocked || blocked.blockedByTarget) throw AppError.forbidden('Cannot send message to blocked user');
      }
    }

    const attachmentUrls: string[] = [];
    for (const file of files) {
      attachmentUrls.push(await storeMessagingImage(file, conversationId));
    }

    const createdMessageId = await transaction(async (client) => {
      const messageType = files.length > 0 ? (content ? 'mixed' : 'image') : 'text';
      const inserted = await client.query(
        `
        INSERT INTO messages (conversation_id, sender_user_id, content, message_type)
        VALUES ($1, $2, $3, $4)
        RETURNING message_id
        `,
        [conversationId, senderUserId, content || null, messageType]
      );
      const messageId = inserted.rows[0].message_id as number;

      for (let i = 0; i < attachmentUrls.length; i++) {
        const file = files[i];
        await client.query(
          `
          INSERT INTO message_attachments (message_id, file_url, file_type, mime_type, file_size)
          VALUES ($1, $2, 'image', $3, $4)
          `,
          [messageId, attachmentUrls[i], file.mimetype || null, file.size || null]
        );
      }

      await client.query(
        `UPDATE conversations SET last_message_id = $1, updated_at = NOW() WHERE conversation_id = $2`,
        [messageId, conversationId]
      );

      await client.query(
        `UPDATE conversation_participants SET last_read_message_id = $1 WHERE conversation_id = $2 AND user_id = $3`,
        [messageId, conversationId, senderUserId]
      );

      return messageId;
    });

    const messagePayload = await this.getMessageById(createdMessageId, participant.user_id);

    return messagePayload;
  }

  static async markConversationRead(conversationId: number, userId: number, lastReadMessageId?: number) {
    await this.ensureParticipant(conversationId, userId);
    let effectiveMessageId = lastReadMessageId;
    if (!effectiveMessageId) {
      const last = await queryOne<{ message_id: number }>(
        `SELECT message_id FROM messages WHERE conversation_id = $1 AND deleted_at IS NULL ORDER BY message_id DESC LIMIT 1`,
        [conversationId]
      );
      effectiveMessageId = last?.message_id;
    }
    if (!effectiveMessageId) return { success: true };

    await query(
      `
      UPDATE conversation_participants
      SET last_read_message_id = GREATEST(COALESCE(last_read_message_id, 0), $1)
      WHERE conversation_id = $2 AND user_id = $3
      `,
      [effectiveMessageId, conversationId, userId]
    );
    return { success: true, lastReadMessageId: effectiveMessageId };
  }

  static async addParticipants(conversationId: number, actorUserId: number, participantIds: number[]) {
    const actor = await this.ensureParticipant(conversationId, actorUserId);
    if (!['owner', 'admin'].includes(actor.role)) throw AppError.forbidden('Only owner/admin can add participants');

    const cleanIds = Array.from(new Set(participantIds.filter((id) => Number.isInteger(id) && id > 0 && id !== actorUserId)));
    for (const userId of cleanIds) {
      const blocked = await IdentityService.isBlocked(actorUserId, userId);
      if (blocked.isBlocked || blocked.blockedByTarget) {
        throw AppError.forbidden('Cannot add blocked user to conversation');
      }
    }
    await IdentityService.assertChatEligibleUserIds(cleanIds);
    for (const userId of cleanIds) {
      await query(
        `
        INSERT INTO conversation_participants (conversation_id, user_id, role, is_active, left_at)
        VALUES ($1, $2, 'member', true, NULL)
        ON CONFLICT (conversation_id, user_id)
        DO UPDATE SET is_active = true, left_at = NULL
        `,
        [conversationId, userId]
      );
    }
    return this.getConversationById(conversationId, actorUserId);
  }

  static async leaveConversation(conversationId: number, userId: number) {
    await this.ensureParticipant(conversationId, userId);
    await query(
      `
      UPDATE conversation_participants
      SET is_active = false, left_at = NOW()
      WHERE conversation_id = $1 AND user_id = $2
      `,
      [conversationId, userId]
    );
    return { success: true };
  }

  /** Soft-delete a message you sent ("unsend"). Updates conversation last_message_id when needed. */
  static async unsendMessage(conversationId: number, messageId: number, userId: number) {
    await this.ensureParticipant(conversationId, userId);
    const msg = await queryOne<{
      message_id: number;
      conversation_id: number;
      sender_user_id: number;
    }>(
      `
      SELECT message_id, conversation_id, sender_user_id
      FROM messages
      WHERE message_id = $1 AND deleted_at IS NULL
      `,
      [messageId]
    );
    if (!msg) throw AppError.notFound('Message not found');
    if (msg.conversation_id !== conversationId) throw AppError.badRequest('Message does not belong to this conversation');
    if (msg.sender_user_id !== userId) throw AppError.forbidden('You can only unsend your own messages');

    const readRow = await queryOne<{ cnt: string }>(
      `
      SELECT COUNT(*)::text AS cnt
      FROM conversation_participants
      WHERE conversation_id = $1
        AND user_id <> $2
        AND is_active = true
        AND last_read_message_id IS NOT NULL
        AND last_read_message_id >= $3
      `,
      [conversationId, userId, messageId]
    );
    if (readRow && parseInt(readRow.cnt, 10) > 0) {
      throw AppError.badRequest('Cannot unsend a message that was already read');
    }

    await transaction(async (client) => {
      const lastConv = await client.query<{ last_message_id: number | null }>(
        `SELECT last_message_id FROM conversations WHERE conversation_id = $1`,
        [conversationId]
      );
      const lastId = lastConv.rows[0]?.last_message_id ?? null;

      await client.query(`UPDATE messages SET deleted_at = NOW() WHERE message_id = $1`, [messageId]);

      if (lastId === messageId) {
        const prev = await client.query<{ message_id: number }>(
          `
          SELECT message_id FROM messages
          WHERE conversation_id = $1 AND deleted_at IS NULL
          ORDER BY message_id DESC
          LIMIT 1
          `,
          [conversationId]
        );
        const newLast = prev.rows[0]?.message_id ?? null;
        await client.query(
          `UPDATE conversations SET last_message_id = $1, updated_at = NOW() WHERE conversation_id = $2`,
          [newLast, conversationId]
        );
      }
    });

    return { success: true };
  }

  private static async ensureParticipant(conversationId: number, userId: number) {
    const participant = await queryOne<{ user_id: number; role: 'owner' | 'admin' | 'member' }>(
      `
      SELECT user_id, role
      FROM conversation_participants
      WHERE conversation_id = $1 AND user_id = $2 AND is_active = true
      `,
      [conversationId, userId]
    );
    if (!participant) throw AppError.forbidden('You are not a participant of this conversation');
    return participant;
  }

  private static async getConversationById(conversationId: number, userId: number) {
    const conversations = await this.listConversations(userId);
    const conversation = conversations.find((c) => c.conversation_id === conversationId);
    if (!conversation) throw AppError.notFound('Conversation not found');
    return conversation;
  }

  private static async getMessageById(messageId: number, _userId: number) {
    const msg = await queryOne<any>(
      `
      SELECT
        m.message_id,
        m.conversation_id,
        m.sender_user_id,
        m.content,
        m.message_type,
        m.created_at
      FROM messages m
      WHERE m.message_id = $1
      `,
      [messageId]
    );
    if (!msg) throw AppError.notFound('Message not found');
    const attachments = await query<any>(
      `
      SELECT attachment_id, message_id, file_url, file_type, mime_type, file_size
      FROM message_attachments
      WHERE message_id = $1
      ORDER BY attachment_id ASC
      `,
      [messageId]
    );
    return { ...msg, attachments };
  }
}
