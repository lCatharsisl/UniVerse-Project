import { RemoteServicesService } from '../../infrastructure/services.service';
import { Result } from '../../../../shared/core/result';

export class ResolveItemHandler {
  static async execute(itemType: 'lost' | 'found', itemId: number, userId: number) {
    try {
      if (itemType === 'lost') {
        await RemoteServicesService.resolveLostItem(itemId, userId);
      } else {
        await RemoteServicesService.resolveFoundItem(itemId, userId);
      }
      return Result.ok();
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to resolve item');
    }
  }
}
