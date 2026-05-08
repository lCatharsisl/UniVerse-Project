import { RemoteServicesService } from '../../infrastructure/services.service';
import { Result } from '../../../../shared/core/result';

export class GetLostItemsHandler {
  static async execute(params: any) {
    try {
      const result = await RemoteServicesService.getLostItems(params);
      return Result.ok(result);
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to fetch lost items');
    }
  }
}
