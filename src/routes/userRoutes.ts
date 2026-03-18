import { Router } from 'express';
import {
  getUsers, getUser, getProfile, updateProfile, updateUser, deleteUser, createUser,
  adminResetPassword, toggleUserStatus, bulkCreateUsers, bulkDeleteUsers, getAuditLogs
} from '../controllers/userController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User and Profile management API
 */

// --- User Management ---
router.get('/', authenticateToken, authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE', 'FINANCE'), getUsers);
router.get('/:id', authenticateToken, authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE', 'FINANCE', 'TEACHER'), getUser);
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE'), createUser);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE'), updateUser);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE'), deleteUser);

// ✅ Account Activity & Security (Restricted)
router.patch('/toggle-status/:id', authenticateToken, authorizeRoles('ADMIN', 'HR'), toggleUserStatus);
router.post('/reset-password/:id', authenticateToken, authorizeRoles('ADMIN', 'HR'), adminResetPassword);
router.post('/bulk-create', authenticateToken, authorizeRoles('ADMIN', 'HR'), bulkCreateUsers);
router.post('/bulk-delete', authenticateToken, authorizeRoles('ADMIN'), bulkDeleteUsers);
router.get('/audit-logs', authenticateToken, authorizeRoles('ADMIN'), getAuditLogs);

// --- Profile Management (Authenticated) ---
router.get('/profile/:id', authenticateToken, getProfile);
router.put('/profile/:id', authenticateToken, updateProfile);

export default router;
