import { CampusService } from '../../infrastructure/campus-info.service';
import { Result } from '../../../../shared/core/result';

export class GetDashboardStatsHandler {
  static async execute() {
    try {
      const stats = await CampusService.getDashboardStats();
      return Result.ok(stats);
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to fetch dashboard stats');
    }
  }
}
