import { RemoteServicesService } from '../../infrastructure/services.service';
import { Result } from '../../../../shared/core/result';

export class GetCommentsHandler {
  static async execute(itemType: 'lost' | 'found', itemId: number) {
    try {
      const comments = await RemoteServicesService.getComments(itemType, itemId);
      return Result.ok(comments);
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to get comments');
    }
  }
}
