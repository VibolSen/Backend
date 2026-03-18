import { Router } from 'express';
import { 
    getAttendance, 
    checkIn, 
    checkOut, 
    manualUpdate, 
    getStaffStats, 
    bulkFetchAttendance, 
    getSessionAttendance, 
    submitSessionAttendance,
    checkAttendanceAction,
    syncStudentAttendance
} from '../controllers/attendanceController';

import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Attendance management API
 */

// --- Self-Service Routes (Authenticated User) ---
router.get('/', authenticateToken, getAttendance);
router.post('/', authenticateToken, checkAttendanceAction);
router.post('/check-in', authenticateToken, checkIn);
router.post('/check-out', authenticateToken, checkOut);

// --- Session Attendance (Teachers/Study Office) ---
router.get('/session', authenticateToken, authorizeRoles('TEACHER', 'ADMIN', 'STUDY_OFFICE'), getSessionAttendance);
router.post('/session', authenticateToken, authorizeRoles('TEACHER', 'ADMIN', 'STUDY_OFFICE'), submitSessionAttendance);

// --- Administrative Routes (HR/Admin/Study Office) ---
router.get('/stats', authenticateToken, authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE'), getStaffStats);
router.post('/bulk', authenticateToken, authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE'), bulkFetchAttendance);
router.post('/sync', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), syncStudentAttendance);
router.post('/manual', authenticateToken, authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE'), manualUpdate);

export default router;
