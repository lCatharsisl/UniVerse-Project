import { RemoteServicesService } from '../../infrastructure/services.service';
import { Result } from '../../../../shared/core/result';

export class GetItemImagesHandler {
  static async execute(itemType: 'lost' | 'found', itemId: number) {
    try {
      const images = await RemoteServicesService.getItemImages(itemType, itemId);
      return Result.ok(images);
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to get item images');
    }
  }
}
