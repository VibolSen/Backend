import { Router } from 'express';
import { updateProgress, getEnrollments, createEnrollment } from '../controllers/enrollmentController';

const router = Router();

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
router.post('/progress', updateProgress);

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
router.get('/', getEnrollments);
router.post('/', createEnrollment);

export default router;
