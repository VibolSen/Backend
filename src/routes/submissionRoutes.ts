import { Router } from 'express';
import { getSubmission, updateSubmission, createSubmission } from '../controllers/submissionController';
import { upload } from '../middleware/upload';

const router = Router();
/**
 * @swagger
 * tags:
 *   name: Submissions
 *   description: Assignment submissions management API
 */

/**
 * @swagger
 * /api/submissions/{id}:
 *   get:
 *     summary: Get a submission by ID
 *     tags: [Submissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Submission details
 *   put:
 *     summary: Update a submission
 *     tags: [Submissions]
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
 *         description: Submission updated
 *
 * /api/submissions:
 *   post:
 *     summary: Create a submission
 *     tags: [Submissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Submission created
 */
router.get('/:id', getSubmission);
router.put('/:id', upload.array('files', 5), updateSubmission);
router.post('/', upload.array('files', 5), createSubmission);

export default router;
