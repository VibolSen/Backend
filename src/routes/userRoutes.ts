import { Router } from 'express';
import { 
  getUsers, getUser, getProfile, updateProfile, updateUser, deleteUser, createUser,
  adminResetPassword, toggleUserStatus, bulkCreateUsers, getAuditLogs
} from '../controllers/userController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User and Profile management API
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', getUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/', updateUser);
router.delete('/', deleteUser);

// ✅ Account Management Routes
router.patch('/toggle-status/:id', toggleUserStatus);
router.post('/reset-password/:id', adminResetPassword);
router.post('/bulk-create', authenticateToken, authorizeRoles('ADMIN', 'HR'), bulkCreateUsers);
router.get('/audit-logs', authenticateToken, authorizeRoles('ADMIN'), getAuditLogs);

/**
 * @swagger
 * /api/users/profile/{id}:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile details
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.get('/profile/:id', getProfile);
router.put('/profile/:id', updateProfile);

export default router;
