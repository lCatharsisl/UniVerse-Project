import { RemoteServicesService } from '../../infrastructure/services.service';
import { Result } from '../../../../shared/core/result';

export class DeleteLostItemHandler {
  static async execute(itemId: number, userId: number, userRole?: string) {
    try {
      await RemoteServicesService.deleteLostItem(itemId, userId, userRole);
      return Result.ok();
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to delete lost item');
    }
  }
}
