import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../middleware/auth';
import { MessagingService } from '../../infrastructure/messaging.service';

export class MessagingController {
  static async searchUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const currentUserId = req.userId!;
      const q = String(req.query.q || '').trim();
      if (!q) return res.status(400).json({ error: 'q is required' });
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const users = await MessagingService.searchUsers(currentUserId, q, Number.isNaN(limit) ? 20 : limit);
      return res.json(users);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to search users' });
    }
  }

  static async listConversations(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const list = await MessagingService.listConversations(userId);
      return res.json(list);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to list conversations' });
    }
  }

  static async unreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const out = await MessagingService.getUnreadCount(userId);
      return res.json(out);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch unread count' });
    }
  }

  static async createConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const currentUserId = req.userId!;
      const { participantIds, title, isGroup } = req.body || {};
      if (!Array.isArray(participantIds)) return res.status(400).json({ error: 'participantIds must be an array' });
      const conversation = await MessagingService.createConversation(
        currentUserId,
        title ? String(title) : null,
        participantIds.map((x: any) => parseInt(String(x), 10)).filter((x: number) => !Number.isNaN(x)),
        Boolean(isGroup)
      );
      return res.status(201).json(conversation);
    } catch (error: any) {
      const status = error?.statusCode || 400;
      return res.status(status).json({ error: error.message || 'Failed to create conversation' });
    }
  }

  static async addParticipants(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const conversationId = parseInt(req.params.id, 10);
      const { participantIds } = req.body || {};
      if (!Array.isArray(participantIds)) return res.status(400).json({ error: 'participantIds must be an array' });
      const conversation = await MessagingService.addParticipants(
        conversationId,
        userId,
        participantIds.map((x: any) => parseInt(String(x), 10)).filter((x: number) => !Number.isNaN(x))
      );
      return res.json(conversation);
    } catch (error: any) {
      const status = error?.statusCode || 400;
      return res.status(status).json({ error: error.message || 'Failed to add participants' });
    }
  }

  static async leaveConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const conversationId = parseInt(req.params.id, 10);
      const out = await MessagingService.leaveConversation(conversationId, userId);
      return res.json(out);
    } catch (error: any) {
      const status = error?.statusCode || 400;
      return res.status(status).json({ error: error.message || 'Failed to leave conversation' });
    }
  }

  /** Remove chat from your list (same as leave). */
  static async deleteConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const conversationId = parseInt(req.params.id, 10);
      if (Number.isNaN(conversationId)) return res.status(400).json({ error: 'Invalid conversation id' });
      const out = await MessagingService.leaveConversation(conversationId, userId);
      return res.json(out);
    } catch (error: any) {
      const status = error?.statusCode || 400;
      return res.status(status).json({ error: error.message || 'Failed to delete conversation' });
    }
  }

  static async unsendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const conversationId = parseInt(req.params.id, 10);
      const messageId = parseInt(req.params.messageId, 10);
      if (Number.isNaN(conversationId) || Number.isNaN(messageId)) {
        return res.status(400).json({ error: 'Invalid id' });
      }
      // Service katmanında unsend henüz yok; geçici olarak net hata dön.
      return res.status(501).json({ error: 'Unsend message is not implemented yet' });
    } catch (error: any) {
      const status = error?.statusCode || 400;
      return res.status(status).json({ error: error.message || 'Failed to unsend message' });
    }
  }

  static async searchConversationMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const conversationId = parseInt(req.params.id, 10);
      const q = String(req.query.q || '').trim();
      if (q.length < 1) return res.status(400).json({ error: 'q is required' });
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 30;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
      const items = await MessagingService.searchMessagesInConversation(
        conversationId,
        userId,
        q,
        Number.isNaN(limit) ? 30 : limit,
        Number.isNaN(offset) ? 0 : offset
      );
      return res.json(items);
    } catch (error: any) {
      const status = error?.statusCode || 400;
      return res.status(status).json({ error: error.message || 'Search failed' });
    }
  }

  static async getSharedContent(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const conversationId = parseInt(req.params.id, 10);
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 60;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
      const out = await MessagingService.getSharedConversationContent(
        conversationId,
        userId,
        Number.isNaN(limit) ? 60 : limit,
        Number.isNaN(offset) ? 0 : offset
      );
      return res.json(out);
    } catch (error: any) {
      const status = error?.statusCode || 400;
      return res.status(status).json({ error: error.message || 'Failed to load shared content' });
    }
  }

  static async setNotificationsMuted(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const conversationId = parseInt(req.params.id, 10);
      const raw = req.body?.muted;
      let muted: boolean;
      if (raw === true || raw === 'true' || raw === 1) muted = true;
      else if (raw === false || raw === 'false' || raw === 0) muted = false;
      else {
        return res.status(400).json({ error: 'muted (boolean) is required' });
      }
      const out = await MessagingService.setConversationNotificationsMuted(
        conversationId,
        userId,
        muted
      );
      return res.json(out);
    } catch (error: any) {
      const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
      return res.status(status).json({ error: error.message || 'Failed to update notifications' });
    }
  }
  static async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const conversationId = parseInt(req.params.id, 10);
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
      const anchorRaw = req.query.anchorMessageId;
      const anchorMessageId =
        anchorRaw != null && String(anchorRaw) !== '' ? parseInt(String(anchorRaw), 10) : undefined;
      const items = await MessagingService.getConversationMessages(
        conversationId,
        userId,
        Number.isNaN(limit) ? 50 : limit,
        Number.isNaN(offset) ? 0 : offset,
        anchorMessageId != null && !Number.isNaN(anchorMessageId) ? anchorMessageId : undefined
      );
      return res.json(items);
    } catch (error: any) {
      const status = error?.statusCode || 400;
      return res.status(status).json({ error: error.message || 'Failed to fetch messages' });
    }
  }

  static async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const senderUserId = req.userId!;
      const conversationId = parseInt(req.params.id, 10);
      const files = (req.files as Express.Multer.File[]) || [];
      const message = await MessagingService.sendMessage(conversationId, senderUserId, {
        content: req.body?.content,
        files,
      });
      return res.status(201).json(message);
    } catch (error: any) {
      const status = error?.statusCode || 400;
      return res.status(status).json({ error: error.message || 'Failed to send message' });
    }
  }

  static async markRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const conversationId = parseInt(req.params.id, 10);
      const lastReadMessageId = req.body?.lastReadMessageId ? parseInt(String(req.body.lastReadMessageId), 10) : undefined;
      const out = await MessagingService.markConversationRead(
        conversationId,
        userId,
        lastReadMessageId && !Number.isNaN(lastReadMessageId) ? lastReadMessageId : undefined
      );
      return res.json(out);
    } catch (error: any) {
      const status = error?.statusCode || 400;
      return res.status(status).json({ error: error.message || 'Failed to mark read' });
    }
  }
}
