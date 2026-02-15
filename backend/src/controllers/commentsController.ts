import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { CommentsService } from '../services/commentsService.js';
import { AppError } from '../middleware/errorHandler.js';
import { createCommentSchema, commentParamsSchema } from '../validators/commentValidators.js';

export class CommentsController {
  /**
   * Add comment to item
   * POST /api/items/:type/:id/comments
   */
  static async addComment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Validate params
      const paramsResult = commentParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({ error: paramsResult.error.errors[0].message });
        return;
      }

      // Validate body
      const bodyResult = createCommentSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({ error: bodyResult.error.errors[0].message });
        return;
      }

      const { type, id } = paramsResult.data;
      const { content } = bodyResult.data;

      await CommentsService.addComment(req.userId, type, parseInt(id), content);

      res.status(201).json({ message: 'Comment added successfully' });
    } catch (error) {
      console.error('Add comment error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to add comment' });
    }
  }

  /**
   * Get comments for item
   * GET /api/items/:type/:id/comments
   */
  static async getComments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const paramsResult = commentParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({ error: paramsResult.error.errors[0].message });
        return;
      }

      const { type, id } = paramsResult.data;
      const comments = await CommentsService.getComments(type, parseInt(id));

      res.json({ comments });
    } catch (error) {
      console.error('Get comments error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }

  /**
   * Delete comment
   * DELETE /api/items/comments/:commentId
   */
  static async deleteComment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId || !req.userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const commentId = parseInt(req.params.commentId);
      await CommentsService.deleteComment(commentId, req.userId, req.userRole);

      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Delete comment error:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof Error && error.message.startsWith('Forbidden')) {
        res.status(403).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  }
}
