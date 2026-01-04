import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateSession } from '../middleware/auth.js';
import {
  registerRequestSchema,
  loginRequestSchema,
  verifyEmailRequestSchema,
} from '../validators/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             email: student@example.com
 *             password: password123
 *             role: student
 *             studentNumber: "2024001"
 *             studentName: Ahmet
 *             studentSurname: Yılmaz
 *             departmentId: 1
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: integer
 *                 emailToken:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already registered
 */
router.post(
  '/register',
  validateRequest(registerRequestSchema),
  AuthController.register.bind(AuthController)
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user and get session token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: student@example.com
 *             password: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account deactivated
 */
router.post(
  '/login',
  validateRequest(loginRequestSchema),
  AuthController.login.bind(AuthController)
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user (invalidate session)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticateSession, AuthController.logout.bind(AuthController));

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify user email with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *           example:
 *             token: abc123def456...
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 *       404:
 *         description: Token not found
 */
router.post(
  '/verify-email',
  validateRequest(verifyEmailRequestSchema),
  AuthController.verifyEmail.bind(AuthController)
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticateSession, AuthController.getMe.bind(AuthController));

export default router;

