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

// --- User Management (Restricted to ADMIN/HR) ---
router.get('/', authenticateToken, authorizeRoles('ADMIN', 'HR'), getUsers);
router.get('/:id', authenticateToken, authorizeRoles('ADMIN', 'HR'), getUser);
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'HR'), createUser);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'HR'), updateUser);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), deleteUser);

// ✅ Account Activity & Security (Restricted)
router.patch('/toggle-status/:id', authenticateToken, authorizeRoles('ADMIN', 'HR'), toggleUserStatus);
router.post('/reset-password/:id', authenticateToken, authorizeRoles('ADMIN', 'HR'), adminResetPassword);
router.post('/bulk-create', authenticateToken, authorizeRoles('ADMIN', 'HR'), bulkCreateUsers);
router.get('/audit-logs', authenticateToken, authorizeRoles('ADMIN'), getAuditLogs);

// --- Profile Management (Authenticated) ---
router.get('/profile/:id', authenticateToken, getProfile);
router.put('/profile/:id', authenticateToken, updateProfile);

export default router;
