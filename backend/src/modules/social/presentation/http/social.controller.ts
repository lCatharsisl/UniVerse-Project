import { Request, Response } from 'express';
import { AddCommentHandler } from '../../application/commands/add-comment.handler';
import { SocialService } from '../../infrastructure/social.service';
import { ModerationService, isAcademic } from '../../infrastructure/moderation.service';
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
    if (req.isBanned) return res.status(403).json({ error: 'Social access is restricted for this account' });
    const userId = req.userId!;
    const files = (req.files as Express.Multer.File[]) || [];
    const imageUrl = files.length > 0 ? `/uploads/${files[0].filename}` : undefined;
    
    const result = await CreatePostHandler.execute(userId, req.body, imageUrl);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.status(201).json(result.data);
  }

  static async getFeed(req: AuthenticatedRequest, res: Response) {
    if (req.isBanned) return res.json({ items: [], total: 0 });
    const userId = req.userId!;
    const { limit, offset } = req.query;
    const result = await GetFeedHandler.execute(userId, {
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
    });
    if (!result.success) return res.status(400).json({ error: result.error });
    const data = result.data as { items: any[]; total: number };
    if (data.items?.length) {
      const postIds = data.items.map((i: any) => i.post_id);
      const myReports = await ModerationService.getMyReportsForPosts(postIds, userId);
      data.items = data.items.map((i: any) => ({
        ...i,
        has_reported: !!myReports[i.post_id],
        my_report_type: myReports[i.post_id] || null,
      }));
    }
    if (isAcademic(req.userRole || '') && data.items?.length) {
      const counts = await ModerationService.getPostReportCounts(data.items.map((i: any) => i.post_id));
      data.items = data.items.map((i: any) => ({ ...i, reports_count: counts[i.post_id] ?? 0 }));
    }
    return res.json(data);
  }

  static async getDiscover(req: AuthenticatedRequest, res: Response) {
    if (req.isBanned) return res.json({ items: [], total: 0 });
    const userId = req.userId!;
    const { limit, offset } = req.query;
    try {
      const data = await SocialService.getFeedItems(
        userId,
        'discover',
        undefined,
        limit ? parseInt(limit as string, 10) : 20,
        offset ? parseInt(offset as string, 10) : 0
      );
      if (data.items?.length) {
        const postIds = data.items.map((i: any) => i.post_id);
        const myReports = await ModerationService.getMyReportsForPosts(postIds, userId);
        data.items = data.items.map((i: any) => ({
          ...i,
          has_reported: !!myReports[i.post_id],
          my_report_type: myReports[i.post_id] || null,
        }));
      }
      if (isAcademic(req.userRole || '') && data.items?.length) {
        const counts = await ModerationService.getPostReportCounts(data.items.map((i: any) => i.post_id));
        data.items = data.items.map((i: any) => ({ ...i, reports_count: counts[i.post_id] ?? 0 }));
      }
      return res.json(data);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to get discover feed' });
    }
  }

  static async deletePost(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const userRole = req.userRole || '';
    const { id } = req.params;
    const result = await DeletePostHandler.execute(parseInt(id), userId, userRole);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ message: 'Post deleted successfully' });
  }

  static async toggleLike(req: AuthenticatedRequest, res: Response) {
    if (req.isBanned) return res.status(403).json({ error: 'Social access is restricted for this account' });
    const userId = req.userId!;
    const { id } = req.params;
    const result = await ToggleLikeHandler.execute(parseInt(id), userId);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json(result.data);
  }

  static async toggleRepost(req: AuthenticatedRequest, res: Response) {
    if (req.isBanned) return res.status(403).json({ error: 'Social access is restricted for this account' });
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
    if (req.isBanned) return res.status(403).json({ error: 'Social access is restricted for this account' });
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
    if (req.isBanned) return res.status(403).json({ error: 'Social access is restricted for this account' });
    const followerId = req.userId!;
    const { id: followingId } = req.params;
    try {
      const result = await SocialService.toggleFollow(followerId, parseInt(followingId));
      return res.json(result);
    } catch (error: any) {
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  static async getFollowStats(req: AuthenticatedRequest, res: Response) {
    const currentUserId = req.userId!;
    const { id } = req.params;
    try {
      const [stats, isFollowing] = await Promise.all([
        SocialService.getFollowStats(parseInt(id)),
        SocialService.isFollowing(currentUserId, parseInt(id))
      ]);
      return res.json({ ...stats, isFollowing });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to fetch follow stats' });
    }
  }

  static async getFollowers(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const list = await SocialService.getFollowers(parseInt(id));
      return res.json(list);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to fetch followers' });
    }
  }

  static async getFollowing(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const list = await SocialService.getFollowing(parseInt(id));
      return res.json(list);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to fetch following' });
    }
  }

  // ─── Moderation (reports & warnings) ───────────────────────────────────────
  static async reportPost(req: AuthenticatedRequest, res: Response) {
    if (req.isBanned) return res.status(403).json({ error: 'Social access is restricted for this account' });
    const userId = req.userId!;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid post id' });
    const reportType = (req.body && req.body.reportType) ? String(req.body.reportType) : 'other';
    try {
      await ModerationService.reportPost(id, userId, reportType);
      return res.status(201).json({ message: 'Report submitted' });
    } catch (error: any) {
      const msg = error?.message || '';
      const isDbError = msg.includes('relation') || msg.includes('does not exist') || msg.includes('column');
      const message = isDbError
        ? 'Report feature is not available. Please ensure database migration 006 has been run.'
        : (msg || 'Failed to report post');
      return res.status(500).json({ error: message });
    }
  }

  static async removeReportPost(req: AuthenticatedRequest, res: Response) {
    if (req.isBanned) return res.status(403).json({ error: 'Social access is restricted for this account' });
    const userId = req.userId!;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid post id' });
    try {
      await ModerationService.removeMyReport(id, userId);
      return res.json({ message: 'Report removed' });
    } catch (error: any) {
      const code = (error as any)?.statusCode ?? 400;
      return res.status(code).json({ error: error.message || 'Failed to remove report' });
    }
  }

  static async reportUser(req: AuthenticatedRequest, res: Response) {
    if (req.isBanned) return res.status(403).json({ error: 'Social access is restricted for this account' });
    const userId = req.userId!;
    const { id } = req.params;
    const { reportType } = req.body || {};
    try {
      await ModerationService.reportUser(parseInt(id), userId, reportType || 'other');
      return res.status(201).json({ message: 'Report submitted' });
    } catch (error: any) {
      const code = (error as any)?.statusCode ?? 400;
      return res.status(code).json({ error: error.message || 'Failed to report user' });
    }
  }

  static async getMyUserReport(req: AuthenticatedRequest, res: Response) {
    const reporterId = req.userId!;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });
    try {
      const result = await ModerationService.getMyReportForUser(id, reporterId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to get report status' });
    }
  }

  static async removeReportUser(req: AuthenticatedRequest, res: Response) {
    if (req.isBanned) return res.status(403).json({ error: 'Social access is restricted for this account' });
    const userId = req.userId!;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });
    try {
      await ModerationService.removeMyUserReport(id, userId);
      return res.json({ message: 'Report removed' });
    } catch (error: any) {
      const code = (error as any)?.statusCode ?? 400;
      return res.status(code).json({ error: error.message || 'Failed to remove report' });
    }
  }

  static async getReportedPosts(req: AuthenticatedRequest, res: Response) {
    if (!isAcademic(req.userRole || '')) return res.status(403).json({ error: 'Academic access only' });
    try {
      const reportType = (req.query.reportType as string) || undefined;
      const posts = await ModerationService.getReportedPosts(50, reportType);
      return res.json(posts);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch reported posts' });
    }
  }

  static async getReportedUsers(req: AuthenticatedRequest, res: Response) {
    if (!isAcademic(req.userRole || '')) return res.status(403).json({ error: 'Academic access only' });
    try {
      const reportType = (req.query.reportType as string) || undefined;
      const list = await ModerationService.getReportedUsers(50, reportType);
      const IdentityService = (await import('../../../identity/infrastructure/identity.service')).IdentityService;
      const enriched = await Promise.all(list.map(async (u: any) => {
        try {
          const profile = await IdentityService.getPublicProfile(u.user_id);
          return { ...profile, reports_count: u.reports_count };
        } catch {
          return { user_id: u.user_id, reports_count: u.reports_count };
        }
      }));
      return res.json(enriched);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch reported users' });
    }
  }

  static async getPostReporters(req: AuthenticatedRequest, res: Response) {
    if (!isAcademic(req.userRole || '')) return res.status(403).json({ error: 'Academic access only' });
    const { id } = req.params;
    try {
      const list = await ModerationService.getReportersForPost(parseInt(id));
      return res.json(list);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch reporters' });
    }
  }

  static async getUserReporters(req: AuthenticatedRequest, res: Response) {
    if (!isAcademic(req.userRole || '')) return res.status(403).json({ error: 'Academic access only' });
    const { id } = req.params;
    try {
      const list = await ModerationService.getReportersForUser(parseInt(id));
      return res.json(list);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch reporters' });
    }
  }

  static async getPostReportCount(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const count = await ModerationService.getPostReportCount(parseInt(id));
    if (!isAcademic(req.userRole || '')) return res.json({ count: 0 });
    return res.json({ count });
  }

  static async addWarning(req: AuthenticatedRequest, res: Response) {
    if (!isAcademic(req.userRole || '')) return res.status(403).json({ error: 'Academic access only' });
    const issuerId = req.userId!;
    const { id } = req.params;
    const { tier } = req.body || {};
    if (![1, 2, 3, 4].includes(tier)) return res.status(400).json({ error: 'Invalid tier (1-4)' });
    try {
      const result = await ModerationService.addWarning(parseInt(id), tier, issuerId);
      return res.json(result);
    } catch (error: any) {
      return res.status(error.status || 400).json({ error: error.message || 'Failed to add warning' });
    }
  }

  static async updateUserWarning(req: AuthenticatedRequest, res: Response) {
    if (!isAcademic(req.userRole || '')) return res.status(403).json({ error: 'Academic access only' });
    const issuerId = req.userId!;
    const { id } = req.params;
    const targetId = parseInt(id);
    const { action, tier } = req.body || {};
    try {
      if (action === 'remove_warning') {
        const result = await ModerationService.removeWarning(targetId, issuerId);
        return res.json(result);
      }
      if (action === 'set_tier' && [0, 1, 2, 3].includes(tier)) {
        const result = await ModerationService.setWarningTier(targetId, tier, issuerId);
        return res.json(result);
      }
      if (action === 'ban') {
        const result = await ModerationService.setBanned(targetId, true, issuerId);
        return res.json(result);
      }
      if (action === 'unban') {
        const result = await ModerationService.setBanned(targetId, false, issuerId);
        return res.json(result);
      }
      return res.status(400).json({ error: 'Invalid action or tier' });
    } catch (error: any) {
      return res.status(error.status || 400).json({ error: error.message || 'Failed to update warning' });
    }
  }
}
