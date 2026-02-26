import { SocialService } from '../../infrastructure/social.service';
import { Result } from '../../../../shared/core/result';

export class GetUserActivitiesHandler {
  static async execute(currentUserId: number, targetUserId: number, type: 'user_posts' | 'user_likes' | 'user_reposts', options: { limit?: number; offset?: number }) {
    try {
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      const res = await SocialService.getFeedItems(currentUserId, type, targetUserId, limit, offset);
      console.log('GetUserActivitiesHandler returning:', JSON.stringify(res, null, 2));
      return Result.ok(res);
    } catch (error: any) {
      console.error('GetUserActivitiesHandler error:', error);
      return Result.fail(error.message || 'Failed to get user activities');
    }
  }
}
