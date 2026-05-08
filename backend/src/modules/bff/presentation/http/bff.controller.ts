import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../middleware/auth';
import { BffDashboardService } from '../../application/bffDashboard.service';

export class BffController {
  static async dashboardShell(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId!;
    const data = await BffDashboardService.getDashboardShell(userId);
    return res.json(data);
  }
}
