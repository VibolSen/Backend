import express from 'express';
import { getStudents, createStudent, updateStudent, deleteStudent, getStudentCourses, getStudentAssignments, getStudentAttendance, getStudentExams } from '../controllers/studentController';

import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: Student management API
 */

// --- Self-Service & Student Specific Routes (Authenticated) ---
router.get('/my-courses', authenticateToken, getStudentCourses);
router.get('/my-assignments', authenticateToken, getStudentAssignments);
router.get('/my-attendance', authenticateToken, getStudentAttendance);
router.get('/my-exams', authenticateToken, getStudentExams);

// --- Student Management (Restricted to ADMIN/HR/STUDY_OFFICE) ---
router.get('/', authenticateToken, authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE'), getStudents);
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE'), createStudent);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE'), updateStudent);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE'), deleteStudent);

export default router;
