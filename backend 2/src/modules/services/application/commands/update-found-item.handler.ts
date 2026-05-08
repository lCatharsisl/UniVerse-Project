import { RemoteServicesService } from '../../infrastructure/services.service';
import { Result } from '../../../../shared/core/result';

export class UpdateFoundItemHandler {
  static async execute(itemId: number, userId: number, data: any) {
    try {
      await RemoteServicesService.updateFoundItem(itemId, userId, data);
      return Result.ok();
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to update found item');
    }
  }
}
