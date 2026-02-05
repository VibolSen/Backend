import { Router } from 'express';
import { updateProgress, getEnrollments } from '../controllers/enrollmentController';

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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - courseId
 *     responses:
 *       200:
 *         description: Progress updated
 */
router.post('/progress', updateProgress);

/**
 * @swagger
 * /api/enrollments:
 *   get:
 *     summary: Get student enrollments
 *     tags: [Enrollments]
 *     parameters:
 *       - in: query
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of enrollments
 */
router.get('/', getEnrollments);

export default router;
