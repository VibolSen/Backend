import { Router } from 'express';
import { getExams, createExam, updateExam, deleteExam } from '../controllers/examController';
import { upload } from '../middleware/upload';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Exams
 *   description: Exam management API
 */
/**
 * @swagger
 * /api/exams:
 *   get:
 *     summary: Get all exams
 *     tags: [Exams]
 *     responses:
 *       200:
 *         description: List of exams
 *   post:
 *     summary: Create an exam
 *     tags: [Exams]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Exam created
 *
 * /api/exams/{id}:
 *   put:
 *     summary: Update an exam
 *     tags: [Exams]
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
 *         description: Exam updated
 *   delete:
 *     summary: Delete an exam
 *     tags: [Exams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Exam deleted
 */
router.get('/', getExams);
router.post('/', upload.array('attachments', 5), createExam);
router.put('/:id', upload.array('attachments', 5), updateExam);
router.delete('/:id', deleteExam);

export default router;
