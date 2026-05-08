import { RemoteServicesService } from '../../infrastructure/services.service';
import { Result } from '../../../../shared/core/result';

export class DeleteFoundItemHandler {
  static async execute(itemId: number, userId: number) {
    try {
      await RemoteServicesService.deleteFoundItem(itemId, userId);
      return Result.ok();
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to delete found item');
    }
  }
}
