import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { RoomsService } from '../services/roomsService.js';
import { AppError } from '../middleware/errorHandler.js';
import type {
  FreeRoomsQuery,
  RoomAtTimeParams,
  RoomAtTimeQuery,
  RoomScheduleParams,
  RoomScheduleQuery,
} from '../validators/rooms.js';

export class RoomsController {
  static async getFreeRooms(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const queryParams = req.query as unknown as FreeRoomsQuery;
      const rooms = await RoomsService.getFreeRooms(queryParams);

      res.json({
        count: rooms.length,
        rooms,
      });
    } catch (error) {
      throw new AppError(500, 'Failed to fetch free rooms');
    }
  }

  static async getRoomCourseAtTime(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { roomCode } = req.params as RoomAtTimeParams;
      const queryParams = req.query as unknown as RoomAtTimeQuery;

      const result = await RoomsService.getRoomCourseAtTime(roomCode, queryParams);

      if (!result) {
        res.json({
          roomCode,
          isOccupied: false,
          course: null,
        });
        return;
      }

      res.json({
        roomCode: result.room_code,
        isOccupied: result.course_code !== null,
        course: result.course_code
          ? {
              code: result.course_code,
              name: result.course_name,
              dayOfWeek: result.day_of_week,
              startTime: result.start_time,
              endTime: result.end_time,
            }
          : null,
      });
    } catch (error) {
      throw new AppError(500, 'Failed to fetch room course at time');
    }
  }

  static async getRoomSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { roomId } = req.params as RoomScheduleParams;
      const queryParams = req.query as unknown as RoomScheduleQuery;

      const schedule = await RoomsService.getRoomSchedule(roomId, queryParams);

      res.json({
        roomId,
        day: queryParams.day || null,
        schedule,
      });
    } catch (error) {
      throw new AppError(500, 'Failed to fetch room schedule');
    }
  }
}


