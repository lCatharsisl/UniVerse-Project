import { Request, Response } from 'express';
import { GetFreeRoomsHandler } from '../../application/queries/get-free-rooms.handler';

export class AcademicController {
  static async getFreeRooms(req: Request, res: Response) {
    const result = await GetFreeRoomsHandler.execute(req.query);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    return res.json(result.data);
  }
}
