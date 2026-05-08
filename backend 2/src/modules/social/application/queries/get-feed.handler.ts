import { SocialService } from '../../infrastructure/social.service';
import { Result } from '../../../../shared/core/result';

export class GetFeedHandler {
  static async execute(currentUserId: number, options: { limit?: number; offset?: number }) {
    try {
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      const res = await SocialService.getFeedItems(currentUserId, 'feed', undefined, limit, offset);
      return Result.ok(res);
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to get feed');
    }
  }
}
