import { Router } from 'express';
import { 
  updateProgress, 
  getEnrollments, 
  createEnrollment, 
  updateEnrollment, 
  deleteEnrollment 
} from '../controllers/enrollmentController';

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

/**
 * @swagger
 * /api/enrollments/{id}:
 *   put:
 *     summary: Update enrollment status/info
 *     tags: [Enrollments]
 *   delete:
 *     summary: Delete enrollment record
 *     tags: [Enrollments]
 */
router.put('/:id', updateEnrollment);
router.delete('/:id', deleteEnrollment);

export default router;
