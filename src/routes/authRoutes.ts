import { Router } from 'express';
import { login, register, getMe, logout, getUserSessions, revokeOtherSessions, revokeSession } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication API
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);


/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User found
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/me', authenticateToken, getMe);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     summary: Get active user sessions
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 */
router.get('/sessions', authenticateToken, getUserSessions);

/**
 * @swagger
 * /api/auth/sessions/revoke-other:
 *   post:
 *     summary: Sign out other devices
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Other devices signed out
 */
router.post('/sessions/revoke-other', authenticateToken, revokeOtherSessions);

/**
 * @swagger
 * /api/auth/sessions/revoke/{sessionId}:
 *   post:
 *     summary: Sign out a specific device
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked
 */
router.post('/sessions/revoke/:sessionId', authenticateToken, revokeSession);

export default router;

