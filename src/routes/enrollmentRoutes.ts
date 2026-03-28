import { Router } from 'express';
import { updateProgress, getEnrollments, createEnrollment, setFinalGrade, getAutoCalculatedScore } from '../controllers/enrollmentController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// ... (swagger tags omitted for brevity if needed, but I'll keep them)
/**
 * @swagger
 * tags:
 *   name: Enrollments
 *   description: Course enrollment and progress management API
 */

/**
 * @swagger
 * /api/enrollments/progress:
 *   post:
 *     summary: Update student course progress
 *     tags: [Enrollments]
 */
router.post('/progress', authenticateToken, updateProgress);

router.post('/set-grade', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), setFinalGrade);
router.get('/auto-score/:courseId/:studentId', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE', 'TEACHER'), getAutoCalculatedScore);


/**
 * @swagger
 * /api/enrollments:
 *   get:
 *     summary: Get enrollments
 *     tags: [Enrollments]
 *   post:
 *     summary: Create new enrollment
 *     tags: [Enrollments]
 */
router.get('/', authenticateToken, getEnrollments);
router.post('/', authenticateToken, createEnrollment);

export default router;
