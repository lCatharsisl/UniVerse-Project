import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import type { FreeRoomsQuery, RoomAtTimeQuery, RoomScheduleQuery } from '../validators/rooms.js';

interface FreeRoomRow {
  room_id: number;
  room_code: string;
  building_name: string;
  floor_number: number;
}

interface RoomCourseAtTimeRow {
  room_code: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  course_code: string | null;
  course_name: string | null;
}

interface RoomScheduleRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  course_code: string;
  course_name: string;
}

export class RoomsService {
  static async getFreeRooms(params: FreeRoomsQuery): Promise<FreeRoomRow[]> {
    const { day, time, buildingName, floorNumber } = params;

    const result = await query<FreeRoomRow>(
      `SELECT * FROM fn_free_rooms_at_time($1, $2::time, $3, $4)`,
      [day, time, buildingName || null, floorNumber || null]
    );

    return result;
  }

  static async getRoomCourseAtTime(
    roomCode: string,
    params: RoomAtTimeQuery
  ): Promise<RoomCourseAtTimeRow | null> {
    const { day, time } = params;

    const result = await query<RoomCourseAtTimeRow>(
      `SELECT * FROM fn_room_course_at_time($1, $2, $3::time)`,
      [roomCode, day, time]
    );

    if (result.length === 0) {
      return null;
    }

    return result[0];
  }

  static async getRoomSchedule(
    roomId: number,
    params: RoomScheduleQuery
  ): Promise<RoomScheduleRow[]> {
    const { day } = params;

    const result = await query<RoomScheduleRow>(
      `SELECT * FROM fn_room_schedule($1, $2)`,
      [roomId, day || null]
    );

    return result;
  }

  static async isRoomOccupied(
    roomId: number,
    day: number,
    time: string
  ): Promise<boolean> {
    const result = await query<{ fn_room_is_occupied: boolean }>(
      `SELECT fn_room_is_occupied($1, $2, $3::time)`,
      [roomId, day, time]
    );

    return result[0]?.fn_room_is_occupied || false;
  }
}


