import { Request, Response } from 'express';
import { GetDashboardStatsHandler } from '../../application/queries/get-dashboard-stats.handler';

export class CampusInfoController {
  static async getStats(_req: Request, res: Response) {
    const result = await GetDashboardStatsHandler.execute();
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    return res.json(result.data);
  }
}
