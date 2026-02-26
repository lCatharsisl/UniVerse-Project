import { AcademicService } from '../../infrastructure/academic.service';
import { Result } from '../../../../shared/core/result';

export class GetFreeRoomsHandler {
  static async execute(params: any) {
    try {
      const rooms = await AcademicService.getFreeRooms(params);
      return Result.ok(rooms);
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to fetch free rooms');
    }
  }
}
