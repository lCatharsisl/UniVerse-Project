import { Request, Response } from 'express';
import { storePublicUpload } from '../../../../integrations/mediaObjectStorage';
import { AuthenticatedRequest } from '../../../../middleware/auth';
import { isAcademicRole, requireAcademic, requireAdmin, requireNotBanned, requireUser } from '../../../../middleware/policy';
import { AppError } from '../../../../shared/core/errors';
import { AddCommentHandler } from '../../application/commands/add-comment.handler';
import { CreatePostHandler } from '../../application/commands/create-post.handler';
import { DeletePostHandler } from '../../application/commands/delete-post.handler';
import { ToggleLikeHandler } from '../../application/commands/toggle-like.handler';
import { ToggleRepostHandler } from '../../application/commands/toggle-repost.handler';
import { GetUserActivitiesHandler } from '../../application/queries/get-user-activities.handler';
import { GetFeedHandler } from '../../application/queries/get-feed.handler';
import { ModerationService } from '../../infrastructure/moderation.service';
import { SocialService } from '../../infrastructure/social.service';

type FeedPayload = { items: any[]; total: number };

const BANNED_MESSAGE = 'Social access is restricted for this account';
const EMPTY_FEED: FeedPayload = { items: [], total: 0 };

export class SocialController {
  private static parseId(rawValue: unknown, label: string): number {
    const value = Number.parseInt(String(rawValue), 10);
    if (Number.isNaN(value)) {
      throw AppError.badRequest(`Invalid ${label}`);
    }
    return value;
  }

  private static getPagination(query: Request['query']) {
    return {
      limit: query.limit ? Number.parseInt(query.limit as string, 10) : 20,
      offset: query.offset ? Number.parseInt(query.offset as string, 10) : 0,
    };
  }

  private static async enrichFeedItems(
    items: any[],
    userId: number,
    userRole?: string
  ): Promise<any[]> {
    if (!items.length) {
      return items;
    }

    const postIds = items.map((item) => item.post_id);
    const myReports = await ModerationService.getMyReportsForPosts(postIds, userId);
    let enriched = items.map((item) => ({
      ...item,
      has_reported: !!myReports[item.post_id],
      my_report_type: myReports[item.post_id] || null,
    }));

    if (isAcademicRole(userRole)) {
      const counts = await ModerationService.getPostReportCounts(postIds);
      enriched = enriched.map((item) => ({
        ...item,
        reports_count: counts[item.post_id] ?? 0,
      }));
    }

    return enriched;
  }

  private static async enrichSinglePost(
    post: any,
    userId: number,
    userRole?: string
  ): Promise<any> {
    const [myReports, counts] = await Promise.all([
      ModerationService.getMyReportsForPosts([post.post_id], userId),
      isAcademicRole(userRole)
        ? ModerationService.getPostReportCounts([post.post_id])
        : Promise.resolve<Record<number, number>>({}),
    ]);

    return {
      ...post,
      has_reported: !!myReports[post.post_id],
      my_report_type: myReports[post.post_id] || null,
      ...(isAcademicRole(userRole) ? { reports_count: counts[post.post_id] ?? 0 } : {}),
    };
  }

  private static async respond<T>(
    res: Response,
    fn: () => Promise<T>,
    options?: {
      statusCode?: number;
      fallbackMessage?: string;
      defaultStatusCode?: number;
      transformError?: (error: unknown) => { statusCode?: number; message?: string };
    }
  ): Promise<Response> {
    const { statusCode = 200, fallbackMessage = 'Request failed', defaultStatusCode = 500, transformError } =
      options || {};

    try {
      const data = await fn();
      return res.status(statusCode).json(data);
    } catch (error) {
      const transformed = transformError?.(error) || {};

      if (error instanceof AppError) {
        return res.status(transformed.statusCode ?? error.statusCode).json({
          error: transformed.message ?? error.message,
        });
      }

      const statusFromError =
        typeof error === 'object' && error !== null
          ? (error as { statusCode?: number; status?: number }).statusCode ??
            (error as { statusCode?: number; status?: number }).status
          : undefined;
      const messageFromError =
        typeof error === 'object' && error !== null ? (error as { message?: string }).message : undefined;

      return res.status(transformed.statusCode ?? statusFromError ?? defaultStatusCode).json({
        error: transformed.message ?? messageFromError ?? fallbackMessage,
      });
    }
  }

  static async addComment(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const { itemId, itemType, content } = req.body;

    const result = await AddCommentHandler.execute(userId, itemId, itemType, content);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({ message: 'Comment added' });
  }

  static async getComments(req: Request, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        const itemId = SocialController.parseId(req.params.itemId, 'item id');
        return SocialService.getComments(req.params.itemType as any, itemId);
      },
      { fallbackMessage: 'Failed to fetch comments' }
    );
  }

  static async createPost(req: AuthenticatedRequest, res: Response) {
    requireNotBanned(req, BANNED_MESSAGE);
    const userId = requireUser(req);
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      let imageUrl: string | undefined;
      if (files.length > 0) {
        const file = files[0];
        if (!file.buffer) {
          return res.status(400).json({ error: 'Media upload corrupted (retry upload)' });
        }
        imageUrl = await storePublicUpload({
          pathPrefix: `social/posts/${userId}`,
          buffer: file.buffer,
          originalFilename: file.originalname || 'post',
          contentType: file.mimetype || 'application/octet-stream',
        });
      }

      const result = await CreatePostHandler.execute(userId, req.body, imageUrl);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(201).json(result.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Medya yükleme başarısız';
      return res.status(400).json({ error: message });
    }
  }

  static async getFeed(req: AuthenticatedRequest, res: Response) {
    if (req.isBanned) {
      return res.json(EMPTY_FEED);
    }

    const userId = requireUser(req);
    const { limit, offset } = SocialController.getPagination(req.query);
    const result = await GetFeedHandler.execute(userId, { limit, offset });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const data = result.data as FeedPayload;
    data.items = await SocialController.enrichFeedItems(data.items || [], userId, req.userRole);
    return res.json(data);
  }

  static async getDiscover(req: AuthenticatedRequest, res: Response) {
    if (req.isBanned) {
      return res.json(EMPTY_FEED);
    }

    return SocialController.respond(
      res,
      async () => {
        const userId = requireUser(req);
        const { limit, offset } = SocialController.getPagination(req.query);
        const data = await SocialService.getFeedItems(userId, 'discover', undefined, limit, offset);
        data.items = await SocialController.enrichFeedItems(data.items || [], userId, req.userRole);
        return data;
      },
      { fallbackMessage: 'Failed to get discover feed', defaultStatusCode: 400 }
    );
  }

  static async getPost(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireNotBanned(req, BANNED_MESSAGE);
        const userId = requireUser(req);
        const postId = SocialController.parseId(req.params.id, 'post id');
        const post = await SocialService.getPostForViewer(userId, postId);

        if (!post) {
          throw AppError.notFound('Post not found');
        }

        return SocialController.enrichSinglePost(post, userId, req.userRole);
      },
      { fallbackMessage: 'Failed to load post', defaultStatusCode: 400 }
    );
  }

  static async deletePost(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const postId = SocialController.parseId(req.params.id, 'post id');
    const userRole = req.userRole || '';
    const result = await DeletePostHandler.execute(postId, userId, userRole);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ message: 'Post deleted successfully' });
  }

  static async toggleLike(req: AuthenticatedRequest, res: Response) {
    requireNotBanned(req, BANNED_MESSAGE);
    const userId = requireUser(req);
    const postId = SocialController.parseId(req.params.id, 'post id');
    const result = await ToggleLikeHandler.execute(postId, userId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(result.data);
  }

  static async toggleRepost(req: AuthenticatedRequest, res: Response) {
    requireNotBanned(req, BANNED_MESSAGE);
    const userId = requireUser(req);
    const postId = SocialController.parseId(req.params.id, 'post id');
    const result = await ToggleRepostHandler.execute(postId, userId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(result.data);
  }

  static async getUserActivities(req: AuthenticatedRequest, res: Response) {
    const currentUserId = requireUser(req);
    const targetUserId = SocialController.parseId(req.params.id, 'user id');
    const activityType = req.params.type;

    if (!['user_posts', 'user_likes', 'user_reposts'].includes(activityType)) {
      return res.status(400).json({ error: 'Invalid activity type' });
    }

    const { limit, offset } = SocialController.getPagination(req.query);
    const result = await GetUserActivitiesHandler.execute(currentUserId, targetUserId, activityType as any, {
      limit,
      offset,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(result.data);
  }

  static async addPostComment(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireNotBanned(req, BANNED_MESSAGE);
        const userId = requireUser(req);
        const postId = SocialController.parseId(req.params.id, 'post id');
        const { content } = req.body;

        if (!content) {
          throw AppError.badRequest('Content is required');
        }

        return SocialService.addPostComment(userId, postId, content);
      },
      { statusCode: 201, fallbackMessage: 'Failed to add comment' }
    );
  }

  static async getPostComments(req: Request, res: Response) {
    return SocialController.respond(
      res,
      async () => SocialService.getPostComments(SocialController.parseId(req.params.id, 'post id')),
      { fallbackMessage: 'Failed to fetch comments' }
    );
  }

  static async getPostLikes(req: Request, res: Response) {
    return SocialController.respond(
      res,
      async () => SocialService.getPostLikes(SocialController.parseId(req.params.id, 'post id')),
      { fallbackMessage: 'Failed to fetch likes' }
    );
  }

  static async toggleFollow(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireNotBanned(req, BANNED_MESSAGE);
        const followerId = requireUser(req);
        const followingId = SocialController.parseId(req.params.id, 'user id');
        return SocialService.toggleFollow(followerId, followingId);
      },
      { fallbackMessage: 'Failed to update follow state', defaultStatusCode: 400 }
    );
  }

  static async getFollowStats(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        const currentUserId = requireUser(req);
        const targetUserId = SocialController.parseId(req.params.id, 'user id');
        const [stats, isFollowing] = await Promise.all([
          SocialService.getFollowStats(targetUserId),
          SocialService.isFollowing(currentUserId, targetUserId),
        ]);

        return { ...stats, isFollowing };
      },
      { fallbackMessage: 'Failed to fetch follow stats' }
    );
  }

  static async updatePostModeration(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireAdmin(req);
        const postId = SocialController.parseId(req.params.id, 'post id');
        const { clearMedia } = req.body ?? {};
        let contentPatch: string | undefined;
        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'content')) {
          const c = (req.body as { content?: unknown }).content;
          if (c === null || c === undefined) {
            contentPatch = '';
          } else if (typeof c === 'string') {
            contentPatch = c.trim();
          } else {
            throw AppError.badRequest('Invalid content');
          }
        }

        const clearMediaFlag = Boolean(clearMedia);
        const post = await SocialService.adminUpdatePost(postId, {
          content: contentPatch,
          clearMedia: clearMediaFlag || undefined,
        });
        return post ?? { ok: true };
      },
      { fallbackMessage: 'Failed to update post' }
    );
  }

  static async deleteAnyPostComment(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireAdmin(req);
        const commentId = SocialController.parseId(req.params.commentId, 'comment id');
        const row = await SocialService.adminDeletePostComment(commentId);
        return { message: 'Comment removed', ...row };
      },
      { fallbackMessage: 'Failed to delete comment', defaultStatusCode: 400 }
    );
  }

  static async getFollowers(req: Request, res: Response) {
    return SocialController.respond(
      res,
      async () => SocialService.getFollowers(SocialController.parseId(req.params.id, 'user id')),
      { fallbackMessage: 'Failed to fetch followers' }
    );
  }

  static async getFollowing(req: Request, res: Response) {
    return SocialController.respond(
      res,
      async () => SocialService.getFollowing(SocialController.parseId(req.params.id, 'user id')),
      { fallbackMessage: 'Failed to fetch following' }
    );
  }

  static async reportPost(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireNotBanned(req, BANNED_MESSAGE);
        const userId = requireUser(req);
        const postId = SocialController.parseId(req.params.id, 'post id');
        const reportType = req.body?.reportType ? String(req.body.reportType) : 'other';
        await ModerationService.reportPost(postId, userId, reportType);
        return { message: 'Report submitted' };
      },
      {
        statusCode: 201,
        fallbackMessage: 'Failed to report post',
        transformError: (error) => {
          const message = typeof error === 'object' && error !== null ? (error as { message?: string }).message || '' : '';
          const isDbError =
            message.includes('relation') || message.includes('does not exist') || message.includes('column');

          return isDbError
            ? {
                statusCode: 500,
                message: 'Report feature is not available. Please ensure database migration 006 has been run.',
              }
            : {};
        },
      }
    );
  }

  static async removeReportPost(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireNotBanned(req, BANNED_MESSAGE);
        const userId = requireUser(req);
        const postId = SocialController.parseId(req.params.id, 'post id');
        await ModerationService.removeMyReport(postId, userId);
        return { message: 'Report removed' };
      },
      { fallbackMessage: 'Failed to remove report', defaultStatusCode: 400 }
    );
  }

  static async reportUser(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireNotBanned(req, BANNED_MESSAGE);
        const userId = requireUser(req);
        const targetUserId = SocialController.parseId(req.params.id, 'user id');
        const reportType = req.body?.reportType || 'other';
        await ModerationService.reportUser(targetUserId, userId, reportType);
        return { message: 'Report submitted' };
      },
      { statusCode: 201, fallbackMessage: 'Failed to report user', defaultStatusCode: 400 }
    );
  }

  static async getMyUserReport(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        const reporterId = requireUser(req);
        const targetUserId = SocialController.parseId(req.params.id, 'user id');
        return ModerationService.getMyReportForUser(targetUserId, reporterId);
      },
      { fallbackMessage: 'Failed to get report status' }
    );
  }

  static async removeReportUser(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireNotBanned(req, BANNED_MESSAGE);
        const userId = requireUser(req);
        const targetUserId = SocialController.parseId(req.params.id, 'user id');
        await ModerationService.removeMyUserReport(targetUserId, userId);
        return { message: 'Report removed' };
      },
      { fallbackMessage: 'Failed to remove report', defaultStatusCode: 400 }
    );
  }

  static async getReportedPosts(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireAcademic(req);
        const reportType = (req.query.reportType as string) || undefined;
        return ModerationService.getReportedPosts(50, reportType);
      },
      { fallbackMessage: 'Failed to fetch reported posts' }
    );
  }

  static async getReportedUsers(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireAcademic(req);
        const reportType = (req.query.reportType as string) || undefined;
        const list = await ModerationService.getReportedUsers(50, reportType);
        const IdentityService = (await import('../../../identity/infrastructure/identity.service')).IdentityService;

        return Promise.all(
          list.map(async (user: any) => {
            try {
              const profile = await IdentityService.getPublicProfile(user.user_id);
              return { ...profile, reports_count: user.reports_count };
            } catch {
              return { user_id: user.user_id, reports_count: user.reports_count };
            }
          })
        );
      },
      { fallbackMessage: 'Failed to fetch reported users' }
    );
  }

  static async getPostReporters(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireAcademic(req);
        return ModerationService.getReportersForPost(SocialController.parseId(req.params.id, 'post id'));
      },
      { fallbackMessage: 'Failed to fetch reporters' }
    );
  }

  static async getUserReporters(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireAcademic(req);
        return ModerationService.getReportersForUser(SocialController.parseId(req.params.id, 'user id'));
      },
      { fallbackMessage: 'Failed to fetch reporters' }
    );
  }

  static async getPostReportCount(req: AuthenticatedRequest, res: Response) {
    const postId = SocialController.parseId(req.params.id, 'post id');

    if (!isAcademicRole(req.userRole)) {
      return res.json({ count: 0 });
    }

    const count = await ModerationService.getPostReportCount(postId);
    return res.json({ count });
  }

  static async addWarning(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireAcademic(req);
        const issuerId = requireUser(req);
        const targetUserId = SocialController.parseId(req.params.id, 'user id');
        const { tier } = req.body || {};

        if (![1, 2, 3, 4].includes(tier)) {
          throw AppError.badRequest('Invalid tier (1-4)');
        }

        return ModerationService.addWarning(targetUserId, tier, issuerId);
      },
      { fallbackMessage: 'Failed to add warning', defaultStatusCode: 400 }
    );
  }

  static async updateUserWarning(req: AuthenticatedRequest, res: Response) {
    return SocialController.respond(
      res,
      async () => {
        requireAcademic(req);
        const issuerId = requireUser(req);
        const targetUserId = SocialController.parseId(req.params.id, 'user id');
        const { action, tier } = req.body || {};

        if (action === 'remove_warning') {
          return ModerationService.removeWarning(targetUserId, issuerId);
        }
        if (action === 'set_tier' && [0, 1, 2, 3].includes(tier)) {
          return ModerationService.setWarningTier(targetUserId, tier, issuerId);
        }
        if (action === 'ban') {
          return ModerationService.setBanned(targetUserId, true, issuerId);
        }
        if (action === 'unban') {
          return ModerationService.setBanned(targetUserId, false, issuerId);
        }

        throw AppError.badRequest('Invalid action or tier');
      },
      { fallbackMessage: 'Failed to update warning', defaultStatusCode: 400 }
    );
  }
}
