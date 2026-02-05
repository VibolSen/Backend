import { Router } from 'express';
import { getFaculties, createFaculty, updateFaculty, deleteFaculty } from '../controllers/facultyController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Faculties
 *   description: Faculty management API
 */

/**
 * @swagger
 * /api/faculties:
 *   get:
 *     summary: Get all faculties
 *     tags: [Faculties]
 *     responses:
 *       200:
 *         description: List of faculties
 */
router.get('/', getFaculties);

/**
 * @swagger
 * /api/faculties:
 *   post:
 *     summary: Create a faculty
 *     tags: [Faculties]
 *     responses:
 *       201:
 *         description: Faculty created
 */
router.post('/', createFaculty);

/**
 * @swagger
 * /api/faculties:
 *   put:
 *     summary: Update a faculty
 *     tags: [Faculties]
 *     responses:
 *       200:
 *         description: Faculty updated
 */
router.put('/:id', updateFaculty);

/**
 * @swagger
 * /api/faculties:
 *   delete:
 *     summary: Delete a faculty
 *     tags: [Faculties]
 *     responses:
 *       200:
 *         description: Faculty deleted
 */
router.delete('/:id', deleteFaculty);

export default router;
