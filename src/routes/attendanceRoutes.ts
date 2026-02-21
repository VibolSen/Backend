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
    checkAttendanceAction 
} from '../controllers/attendanceController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Attendance management API
 */

router.get('/', getAttendance);
router.post('/', checkAttendanceAction); // New dispatcher for generic POST /attendance
router.get('/session', getSessionAttendance);
router.post('/session', submitSessionAttendance);
router.get('/stats', getStaffStats);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.post('/bulk', bulkFetchAttendance);
router.post('/manual', manualUpdate);

export default router;
