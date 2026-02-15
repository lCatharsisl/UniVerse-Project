import { Router } from 'express';
import { CommentsController } from '../controllers/commentsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/items/{type}/{id}/comments:
 *   post:
 *     summary: Add a comment to an item
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [lost, found]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Comment added successfully
 */
router.post('/:type/:id/comments', authenticateToken, CommentsController.addComment);

/**
 * @swagger
 * /api/items/{type}/{id}/comments:
 *   get:
 *     summary: Get all comments for an item
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [lost, found]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of comments
 */
router.get('/:type/:id/comments', CommentsController.getComments);

/**
 * @swagger
 * /api/items/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 */
router.delete('/comments/:commentId', authenticateToken, CommentsController.deleteComment);

export default router;
