import { RemoteServicesService } from '../../infrastructure/services.service';
import { Result } from '../../../../shared/core/result';

export class AddCommentHandler {
  static async execute(userId: number, itemType: 'lost' | 'found', itemId: number, content: string) {
    if (!content) return Result.fail('Comment content is required');
    try {
      await RemoteServicesService.addComment(userId, itemType, itemId, content);
      return Result.ok();
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to add comment');
    }
  }
}
