import { Router } from 'express';
import { getLibraryResources, createLibraryResource, deleteLibraryResource, updateLibraryResource } from '../controllers/libraryController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Library
 *   description: Library resources management API
 */
/**
 * @swagger
 * /api/library:
 *   get:
 *     summary: Get all library resources
 *     tags: [Library]
 *     responses:
 *       200:
 *         description: List of library resources
 *   post:
 *     summary: Create a library resource
 *     tags: [Library]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Library resource created
 *
 * /api/library/{id}:
 *   delete:
 *     summary: Delete a library resource
 *     tags: [Library]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Library resource deleted
 */
router.get('/', getLibraryResources);
router.post('/', createLibraryResource);
router.put('/:id', updateLibraryResource);
router.delete('/:id', deleteLibraryResource);

export default router;
