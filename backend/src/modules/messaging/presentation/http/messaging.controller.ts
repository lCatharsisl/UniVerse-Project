import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../middleware/auth';
import { requireIntParam, requireUser } from '../../../../middleware/policy';
import { MessagingService } from '../../infrastructure/messaging.service';
import { AppError } from '../../../../shared/core/errors';

function firstScalarParam(value: unknown): string | number | undefined {
  if (value == null || value === '') return undefined;
  if (Array.isArray(value)) return firstScalarParam(value[0]);
  if (typeof value === 'string' || typeof value === 'number') return value;
  return undefined;
}

/** JSON gövdesi bazen proxy/istemci zincirinde boş kalabiliyor; query ile yedek. */
function resolveSharedPostIdInput(req: AuthenticatedRequest): string | number | undefined {
  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  const fromBody =
    firstScalarParam(body.sharedPostId) ?? firstScalarParam(body.shared_post_id);
  if (fromBody !== undefined) return fromBody;
  const q = req.query && typeof req.query === 'object' ? (req.query as Record<string, unknown>) : {};
  return firstScalarParam(q.sharedPostId) ?? firstScalarParam(q.shared_post_id);
}

export class MessagingController {
  private static async respond<T>(
    res: Response,
    fn: () => Promise<T>,
    statusCode: number = 200
  ): Promise<Response> {
    try {
      const data = await fn();
      return res.status(statusCode).json(data);
    } catch (error: any) {
      const status = error instanceof AppError ? error.statusCode : error?.statusCode || 400;
      const message = error instanceof AppError ? error.message : error?.message || 'Request failed';
      return res.status(status).json({ error: message });
    }
  }

  static async searchUsers(req: AuthenticatedRequest, res: Response) {
    const currentUserId = requireUser(req);
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'q is required' });
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
    return MessagingController.respond(res, () =>
      MessagingService.searchUsers(currentUserId, q, Number.isNaN(limit) ? 20 : limit)
    );
  }

  static async listConversations(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    return MessagingController.respond(res, () => MessagingService.listConversations(userId));
  }

  static async unreadCount(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    return MessagingController.respond(res, () => MessagingService.getUnreadCount(userId));
  }

  static async createConversation(req: AuthenticatedRequest, res: Response) {
    const currentUserId = requireUser(req);
    const { participantIds, title, isGroup } = req.body || {};
    if (!Array.isArray(participantIds)) return res.status(400).json({ error: 'participantIds must be an array' });
    return MessagingController.respond(
      res,
      () =>
        MessagingService.createConversation(
          currentUserId,
          title ? String(title) : null,
          participantIds.map((x: any) => parseInt(String(x), 10)).filter((x: number) => !Number.isNaN(x)),
          Boolean(isGroup)
        ),
      201
    );
  }

  static async addParticipants(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const conversationId = requireIntParam(req, 'id', 'Invalid conversation id');
    const { participantIds } = req.body || {};
    if (!Array.isArray(participantIds)) return res.status(400).json({ error: 'participantIds must be an array' });
    return MessagingController.respond(res, () =>
      MessagingService.addParticipants(
        conversationId,
        userId,
        participantIds.map((x: any) => parseInt(String(x), 10)).filter((x: number) => !Number.isNaN(x))
      )
    );
  }

  static async leaveConversation(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const conversationId = requireIntParam(req, 'id', 'Invalid conversation id');
    return MessagingController.respond(res, () => MessagingService.leaveConversation(conversationId, userId));
  }

  /** Remove chat from your list (same as leave). */
  static async deleteConversation(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const conversationId = requireIntParam(req, 'id', 'Invalid conversation id');
    return MessagingController.respond(res, () => MessagingService.leaveConversation(conversationId, userId));
  }

  static async unsendMessage(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const conversationId = requireIntParam(req, 'id', 'Invalid conversation id');
    const messageId = requireIntParam(req, 'messageId', 'Invalid message id');
    return MessagingController.respond(res, () => MessagingService.unsendMessage(conversationId, messageId, userId));
  }

  static async searchConversationMessages(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const conversationId = requireIntParam(req, 'id', 'Invalid conversation id');
    const q = String(req.query.q || '').trim();
    if (q.length < 1) return res.status(400).json({ error: 'q is required' });
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 30;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
    return MessagingController.respond(res, () =>
      MessagingService.searchMessagesInConversation(
        conversationId,
        userId,
        q,
        Number.isNaN(limit) ? 30 : limit,
        Number.isNaN(offset) ? 0 : offset
      )
    );
  }

  static async getSharedContent(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const conversationId = requireIntParam(req, 'id', 'Invalid conversation id');
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 60;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
    return MessagingController.respond(res, () =>
      MessagingService.getSharedConversationContent(
        conversationId,
        userId,
        Number.isNaN(limit) ? 60 : limit,
        Number.isNaN(offset) ? 0 : offset
      )
    );
  }

  static async setNotificationsMuted(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const conversationId = requireIntParam(req, 'id', 'Invalid conversation id');
    const raw = req.body?.muted;
    let muted: boolean;
    if (raw === true || raw === 'true' || raw === 1) muted = true;
    else if (raw === false || raw === 'false' || raw === 0) muted = false;
    else {
      return res.status(400).json({ error: 'muted (boolean) is required' });
    }
    return MessagingController.respond(res, () =>
      MessagingService.setConversationNotificationsMuted(conversationId, userId, muted)
    );
  }
  static async getMessages(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const conversationId = requireIntParam(req, 'id', 'Invalid conversation id');
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
    const anchorRaw = req.query.anchorMessageId;
    const anchorMessageId =
      anchorRaw != null && String(anchorRaw) !== '' ? parseInt(String(anchorRaw), 10) : undefined;
    return MessagingController.respond(res, () =>
      MessagingService.getConversationMessages(
        conversationId,
        userId,
        Number.isNaN(limit) ? 50 : limit,
        Number.isNaN(offset) ? 0 : offset,
        anchorMessageId != null && !Number.isNaN(anchorMessageId) ? anchorMessageId : undefined
      )
    );
  }

  static async sendMessage(req: AuthenticatedRequest, res: Response) {
    const senderUserId = requireUser(req);
    const conversationId = requireIntParam(req, 'id', 'Invalid conversation id');
    const files = (req.files as Express.Multer.File[]) || [];
    const sharedPostId = resolveSharedPostIdInput(req);
    return MessagingController.respond(
      res,
      () =>
        MessagingService.sendMessage(conversationId, senderUserId, {
          content: req.body?.content,
          files,
          sharedPostId,
        }),
      201
    );
  }

  static async markRead(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const conversationId = requireIntParam(req, 'id', 'Invalid conversation id');
    const lastReadMessageId = req.body?.lastReadMessageId ? parseInt(String(req.body.lastReadMessageId), 10) : undefined;
    return MessagingController.respond(res, () =>
      MessagingService.markConversationRead(
        conversationId,
        userId,
        lastReadMessageId && !Number.isNaN(lastReadMessageId) ? lastReadMessageId : undefined
      )
    );
  }
}
