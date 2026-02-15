import { z } from 'zod';

export const freeRoomsQuerySchema = z.object({
  day: z.coerce.number().int().min(1).max(7),
  time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Time must be in HH:MM:SS format'),
  buildingName: z.string().optional(),
  floorNumber: z.coerce.number().int().positive().optional(),
});

export const roomAtTimeParamsSchema = z.object({
  roomCode: z.string().min(1),
});

export const roomAtTimeQuerySchema = z.object({
  day: z.coerce.number().int().min(1).max(7),
  time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Time must be in HH:MM:SS format'),
});

export const roomScheduleParamsSchema = z.object({
  roomId: z.coerce.number().int().positive(),
});

export const roomScheduleQuerySchema = z.object({
  day: z.coerce.number().int().min(1).max(7).optional(),
});

export type FreeRoomsQuery = z.infer<typeof freeRoomsQuerySchema>;
export type RoomAtTimeParams = z.infer<typeof roomAtTimeParamsSchema>;
export type RoomAtTimeQuery = z.infer<typeof roomAtTimeQuerySchema>;
export type RoomScheduleParams = z.infer<typeof roomScheduleParamsSchema>;
export type RoomScheduleQuery = z.infer<typeof roomScheduleQuerySchema>;


