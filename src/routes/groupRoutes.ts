import { Router } from 'express';
import { getGroups, getGroup, createGroup, updateGroup, deleteGroup, getGroupStudents } from '../controllers/groupController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Group management API
 */
/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Get all groups
 *     tags: [Groups]
 *     responses:
 *       200:
 *         description: List of groups
 *   post:
 *     summary: Create a group
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Group created
 *
 * /api/groups/{id}:
 *   put:
 *     summary: Update a group
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Group updated
 *   delete:
 *     summary: Delete a group
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group deleted
 */
router.get('/', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE', 'TEACHER'), getGroups);
router.get('/:id/students', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE', 'TEACHER'), getGroupStudents);
router.get('/:id', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE', 'TEACHER'), getGroup);
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), createGroup);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), updateGroup);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), deleteGroup);

export default router;
