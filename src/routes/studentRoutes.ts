import express from 'express';
import { getStudents, createStudent, updateStudent, deleteStudent, getStudentCourses, getStudentAssignments, getStudentAttendance, getStudentExams, getMyGroup } from '../controllers/studentController';

import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: Student management API
 */

// --- Self-Service & Student Specific Routes (Authenticated) ---
router.get('/my-group', authenticateToken, getMyGroup);
router.get('/my-courses', authenticateToken, getStudentCourses);
router.get('/my-assignments', authenticateToken, getStudentAssignments);
router.get('/my-attendance', authenticateToken, getStudentAttendance);
router.get('/my-exams', authenticateToken, getStudentExams);

// --- Student Management (Restricted to ADMIN/STUDY_OFFICE) ---
router.get('/', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), getStudents);
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), createStudent);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), updateStudent);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), deleteStudent);

export default router;
