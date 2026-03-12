import { SocialService } from '../../infrastructure/social.service';
import { Result } from '../../../../shared/core/result';

export class DeletePostHandler {
  static async execute(postId: number, userId: number, userRole?: string) {
    try {
      await SocialService.deletePost(postId, userId, userRole);
      return Result.ok();
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to delete post');
    }
  }
}
