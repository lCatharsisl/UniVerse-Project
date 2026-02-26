import { query } from '../../../config/db';

export class AcademicService {
  static async getFreeRooms(params: any) {
    const { day, time, buildingName, floorNumber } = params;
    const rows = await query('SELECT * FROM fn_free_rooms_at_time($1, $2::time, $3, $4)', 
      [day, time, buildingName || null, floorNumber || null]);
    return rows;
  }
}
