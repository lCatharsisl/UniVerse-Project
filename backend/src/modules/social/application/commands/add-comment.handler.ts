import { SocialService } from '../../infrastructure/social.service';
import { Result } from '../../../../shared/core/result';

export class AddCommentHandler {
  static async execute(userId: number, itemId: number, itemType: 'lost' | 'found', content: string) {
    try {
      const comment = await SocialService.addComment(userId, itemId, itemType, content);
      return Result.ok(comment);
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to add comment');
    }
  }
}
