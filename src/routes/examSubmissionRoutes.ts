import { Router } from 'express';
import { getExamSubmission, updateExamSubmission, createExamSubmission } from '../controllers/examSubmissionController';
import { upload } from '../middleware/upload';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: ExamSubmissions
 *   description: Exam submissions management API
 */

/**
 * @swagger
 * /api/exam-submissions/{id}:
 *   get:
 *     summary: Get an exam submission by ID
 *     tags: [ExamSubmissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Exam submission details
 *   put:
 *     summary: Update an exam submission
 *     tags: [ExamSubmissions]
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
 *         description: Exam submission updated
 *
 * /api/exam-submissions:
 *   post:
 *     summary: Create an exam submission
 *     tags: [ExamSubmissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Exam submission created
 */
router.get('/:id', getExamSubmission);
router.put('/:id', upload.array('files', 5), updateExamSubmission);
router.post('/', upload.array('files', 5), createExamSubmission);

export default router;
