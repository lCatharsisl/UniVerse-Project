import { Router } from 'express';
import { LostFoundController } from '../controllers/lostFoundController.js';
import { authenticateSession } from '../middleware/auth.js';
import {
  createLostItemSchema,
  createFoundItemSchema,
  lostItemsQuerySchema,
  foundItemsQuerySchema,
  resolveItemParamsSchema,
} from '../validators/lostFound.js';
import { validateRequest, validateQuery, validateParams } from '../middleware/validateRequest.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// All routes require authentication
router.use(authenticateSession);

/**
 * @swagger
 * /lost-items:
 *   post:
 *     summary: Create a new lost item report
 *     tags: [Lost Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLostItemRequest'
 *           example:
 *             lostItemName: "Siyah Cüzdan"
 *             location: "Kütüphane"
 *             description: "İçinde kimlik kartı var"
 *             lostDate: "2024-01-15T10:00:00Z"
 *     responses:
 *       201:
 *         description: Lost item created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get list of lost items with filters
 *     tags: [Lost Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location (partial match)
 *       - in: query
 *         name: isResolved
 *         schema:
 *           type: boolean
 *         description: Filter by resolution status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter items lost after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter items lost before this date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Maximum number of items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: List of lost items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LostItemsResponse'
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/lost-items',
  upload.array('images', 5),
  validateRequest(createLostItemSchema),
  LostFoundController.createLostItem.bind(LostFoundController)
);

router.get(
  '/lost-items',
  validateQuery(lostItemsQuerySchema),
  LostFoundController.getLostItems.bind(LostFoundController)
);

/**
 * @swagger
 * /lost-items/{id}/resolve:
 *   patch:
 *     summary: Mark a lost item as resolved
 *     tags: [Lost Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lost item ID
 *     responses:
 *       200:
 *         description: Lost item resolved successfully
 *       400:
 *         description: Item already resolved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lost item not found
 */
router.patch(
  '/lost-items/:id/resolve',
  validateParams(resolveItemParamsSchema),
  LostFoundController.resolveLostItem.bind(LostFoundController)
);

/**
 * @swagger
 * /found-items:
 *   post:
 *     summary: Create a new found item report
 *     tags: [Found Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateFoundItemRequest'
 *           example:
 *             foundItemName: "Siyah Cüzdan"
 *             location: "Kütüphane"
 *             description: "İçinde kimlik kartı var"
 *             foundDate: "2024-01-15T10:00:00Z"
 *     responses:
 *       201:
 *         description: Found item created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get list of found items with filters
 *     tags: [Found Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location (partial match)
 *       - in: query
 *         name: isResolved
 *         schema:
 *           type: boolean
 *         description: Filter by resolution status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter items found after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter items found before this date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Maximum number of items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: List of found items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoundItemsResponse'
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/found-items',
  upload.array('images', 5),
  validateRequest(createFoundItemSchema),
  LostFoundController.createFoundItem.bind(LostFoundController)
);

router.get(
  '/found-items',
  validateQuery(foundItemsQuerySchema),
  LostFoundController.getFoundItems.bind(LostFoundController)
);

/**
 * @swagger
 * /found-items/{id}/resolve:
 *   patch:
 *     summary: Mark a found item as resolved
 *     tags: [Found Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Found item ID
 *     responses:
 *       200:
 *         description: Found item resolved successfully
 *       400:
 *         description: Item already resolved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Found item not found
 */
router.patch(
  '/found-items/:id/resolve',
  validateParams(resolveItemParamsSchema),
  LostFoundController.resolveFoundItem.bind(LostFoundController)
);

// Comment routes
router.post(
  '/:type/:id/comments',
  LostFoundController.addComment.bind(LostFoundController)
);

router.get(
  '/:type/:id/comments',
  LostFoundController.getComments.bind(LostFoundController)
);

// Images route
router.get(
  '/:type/:id/images',
  LostFoundController.getItemImages.bind(LostFoundController)
);

export default router;
