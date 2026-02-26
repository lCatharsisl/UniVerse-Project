import { query } from '../../../config/db';

export class CampusService {
  static async getDashboardStats() {
    const rows = await query<any>('SELECT * FROM mv_dashboard_stats');
    return rows[0];
  }
}
