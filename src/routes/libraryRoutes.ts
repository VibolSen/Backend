import { Router } from 'express';
import { getLibraryResources, createLibraryResource, deleteLibraryResource, updateLibraryResource } from '../controllers/libraryController';
import { upload } from '../middleware/upload';

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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               department:
 *                 type: string
 *               description:
 *                 type: string
 *               publicationYear:
 *                 type: integer
 *               uploadedById:
 *                 type: string
 *               coverImage:
 *                 type: string
 *                 format: binary
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
 *   put:
 *     summary: Update a library resource
 *     tags: [Library]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               department:
 *                 type: string
 *               description:
 *                 type: string
 *               publicationYear:
 *                 type: integer
 *               coverImage:
 *                 type: string
 *                 format: binary
 *               resourceFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Library resource updated
 */
import { authenticateToken, authorizeRoles } from '../middleware/auth';

// Public/Read-only access for authenticated users
router.get('/', authenticateToken, getLibraryResources);

// Restricted access for Admin and Study Office
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'resourceFile', maxCount: 1 }]), createLibraryResource);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'resourceFile', maxCount: 1 }]), updateLibraryResource);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), deleteLibraryResource);

export default router;
