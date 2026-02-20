import { Router } from 'express';
import { getAttendance, checkIn, checkOut, manualUpdate, getStaffStats, bulkFetchAttendance, getSessionAttendance, submitSessionAttendance } from '../controllers/attendanceController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Attendance management API
 */
/**
 * @swagger
 * /api/attendance:
 *   get:
 *     summary: Get all attendance records
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: List of attendance records
 *
 * /api/attendance/session:
 *   get:
 *     summary: Get session attendance for a course
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of attendance records
 *   post:
 *     summary: Submit session attendance
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Attendance saved
 *
 * /api/attendance/stats:
 *   get:
 *     summary: Get staff attendance statistics
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: Attendance statistics
 *
 * /api/attendance/check-in:
 *   post:
 *     summary: Record check-in
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Check-in recorded
 *
 * /api/attendance/check-out:
 *   post:
 *     summary: Record check-out
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Check-out recorded
 *
 * /api/attendance/manual:
 *   post:
 *     summary: Manually update attendance
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Attendance updated manually
 */
router.get('/', getAttendance);
router.get('/session', getSessionAttendance);
router.post('/session', submitSessionAttendance);
router.get('/stats', getStaffStats);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.post('/bulk', bulkFetchAttendance);
router.post('/manual', manualUpdate);
// Note: Bulk fetch isn't implemented in controller yet, adding placeholder or skipping
// Pending: Implementation of bulk fetch.

export default router;
