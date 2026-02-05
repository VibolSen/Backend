import { Router } from 'express';
import { getGradebookData } from '../controllers/gradebookController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Gradebook
 *   description: Gradebook management API
 */

/**
 * @swagger
 * /api/gradebook:
 *   get:
 *     summary: Get all gradebook data
 *     tags: [Gradebook]
 *     responses:
 *       200:
 *         description: Aggregated gradebook data
 */
router.get('/', getGradebookData);

export default router;
