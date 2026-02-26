import { SocialService } from '../../infrastructure/social.service';
import { Result } from '../../../../shared/core/result';

export class ToggleRepostHandler {
  static async execute(postId: number, userId: number) {
    try {
      const res = await SocialService.toggleRepost(postId, userId);
      return Result.ok(res);
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to toggle repost');
    }
  }
}
