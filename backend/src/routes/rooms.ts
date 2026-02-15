import { Router } from 'express';
import { RoomsController } from '../controllers/roomsController.js';
import { authenticateSession } from '../middleware/auth.js';
import {
  freeRoomsQuerySchema,
  roomAtTimeParamsSchema,
  roomAtTimeQuerySchema,
  roomScheduleParamsSchema,
  roomScheduleQuerySchema,
} from '../validators/rooms.js';
import { validateQuery, validateParams } from '../middleware/validateRequest.js';

const router = Router();

// All routes require authentication
router.use(authenticateSession);

/**
 * @swagger
 * /rooms/free:
 *   get:
 *     summary: Get list of free rooms at a specific time
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: day
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 7
 *         description: Day of week (1=Monday, 7=Sunday)
 *         example: 1
 *       - in: query
 *         name: time
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{2}:\d{2}:\d{2}$'
 *         description: Time in HH:MM:SS format
 *         example: "09:00:00"
 *       - in: query
 *         name: buildingName
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by building name
 *         example: "Engineering Building"
 *       - in: query
 *         name: floorNumber
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter by floor number
 *         example: 2
 *     responses:
 *       200:
 *         description: List of free rooms
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FreeRoomsResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/free',
  validateQuery(freeRoomsQuerySchema),
  RoomsController.getFreeRooms.bind(RoomsController)
);

/**
 * @swagger
 * /rooms/{roomCode}/at:
 *   get:
 *     summary: Get course information for a room at specific time
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Room code
 *         example: "ENG-201"
 *       - in: query
 *         name: day
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 7
 *         description: Day of week (1=Monday, 7=Sunday)
 *         example: 1
 *       - in: query
 *         name: time
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{2}:\d{2}:\d{2}$'
 *         description: Time in HH:MM:SS format
 *         example: "09:00:00"
 *     responses:
 *       200:
 *         description: Room course information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomCourseAtTimeResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/:roomCode/at',
  validateParams(roomAtTimeParamsSchema),
  validateQuery(roomAtTimeQuerySchema),
  RoomsController.getRoomCourseAtTime.bind(RoomsController)
);

/**
 * @swagger
 * /rooms/{roomId}/schedule:
 *   get:
 *     summary: Get room schedule (daily or weekly)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *         example: 1
 *       - in: query
 *         name: day
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 7
 *         description: Day of week (1=Monday, 7=Sunday). If not provided, returns weekly schedule.
 *         example: 1
 *     responses:
 *       200:
 *         description: Room schedule
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomScheduleResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/:roomId/schedule',
  validateParams(roomScheduleParamsSchema),
  validateQuery(roomScheduleQuerySchema),
  RoomsController.getRoomSchedule.bind(RoomsController)
);

export default router;

