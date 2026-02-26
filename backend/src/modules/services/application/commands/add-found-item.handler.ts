import { RemoteServicesService } from '../../infrastructure/services.service';
import { Result } from '../../../../shared/core/result';

export class AddFoundItemHandler {
  static async execute(userId: number, data: any, imageUrls: string[]) {
    try {
      const item = await RemoteServicesService.createFoundItem(userId, data, imageUrls);
      return Result.ok(item);
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to create found item');
    }
  }
}
