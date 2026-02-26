import { Request, Response } from 'express';
import { AddCommentHandler } from '../../application/commands/add-comment.handler';
import { SocialService } from '../../infrastructure/social.service';
import { CreatePostHandler } from '../../application/commands/create-post.handler';
import { GetFeedHandler } from '../../application/queries/get-feed.handler';
import { DeletePostHandler } from '../../application/commands/delete-post.handler';
import { ToggleLikeHandler } from '../../application/commands/toggle-like.handler';
import { ToggleRepostHandler } from '../../application/commands/toggle-repost.handler';
import { GetUserActivitiesHandler } from '../../application/queries/get-user-activities.handler';
import { AuthenticatedRequest } from '../../../../middleware/auth';

export class SocialController {
  static async addComment(req: Request, res: Response) {
    const { itemId, itemType, content } = req.body;
    const userId = (req as any).userId; // Usually comes from auth middleware

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await AddCommentHandler.execute(userId, itemId, itemType, content);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    return res.status(201).json({ message: 'Comment added' });
  }

  static async getComments(req: Request, res: Response) {
    const { itemType, itemId } = req.params;
    try {
      const comments = await SocialService.getComments(itemType as any, parseInt(itemId));
      return res.json(comments);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }

  static async createPost(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const files = (req.files as Express.Multer.File[]) || [];
    const imageUrl = files.length > 0 ? `/uploads/${files[0].filename}` : undefined;
    
    const result = await CreatePostHandler.execute(userId, req.body, imageUrl);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.status(201).json(result.data);
  }

  static async getFeed(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { limit, offset } = req.query;
    const result = await GetFeedHandler.execute(userId, { 
      limit: limit ? parseInt(limit as string) : 20, 
      offset: offset ? parseInt(offset as string) : 0 
    });
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json(result.data);
  }

  static async deletePost(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { id } = req.params;
    const result = await DeletePostHandler.execute(parseInt(id), userId);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Post deleted successfully' });
  }

  static async toggleLike(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { id } = req.params;
    const result = await ToggleLikeHandler.execute(parseInt(id), userId);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json(result.data);
  }

  static async toggleRepost(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { id } = req.params;
    const result = await ToggleRepostHandler.execute(parseInt(id), userId);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json(result.data);
  }

  static async getUserActivities(req: AuthenticatedRequest, res: Response) {
    const currentUserId = req.userId!;
    const { id, type } = req.params;
    const { limit, offset } = req.query;

    if (!['user_posts', 'user_likes', 'user_reposts'].includes(type)) {
      return res.status(400).json({ error: 'Invalid activity type' });
    }

    const result = await GetUserActivitiesHandler.execute(
      currentUserId, 
      parseInt(id), 
      type as any, 
      { 
        limit: limit ? parseInt(limit as string) : 20, 
        offset: offset ? parseInt(offset as string) : 0 
      }
    );
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json(result.data);
  }

  static async addPostComment(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const { id } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    
    try {
      const comment = await SocialService.addPostComment(userId, parseInt(id), content);
      return res.status(201).json(comment);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to add comment' });
    }
  }

  static async getPostComments(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const comments = await SocialService.getPostComments(parseInt(id));
      return res.json(comments);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }

  static async getPostLikes(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const likes = await SocialService.getPostLikes(parseInt(id));
      return res.json(likes);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch likes' });
    }
  }

  static async toggleFollow(req: AuthenticatedRequest, res: Response) {
    const followerId = req.userId!;
    const { id: followingId } = req.params;
    try {
      const result = await SocialService.toggleFollow(followerId, parseInt(followingId));
      return res.json(result);
    } catch (error: any) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  static async getFollowStats(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const stats = await SocialService.getFollowStats(parseInt(id));
      return res.json(stats);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to fetch follow stats' });
    }
  }
}
