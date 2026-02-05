import { Router } from 'express';
import { getJobPostings, createJobPosting, getCertificates } from '../controllers/careerController';
import { 
  getJobPostings as getHrJobPostings, 
  createJobPosting as createHrJobPosting, 
  updateJobPosting as updateHrJobPosting, 
  deleteJobPosting as deleteHrJobPosting 
} from '../controllers/hrController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Career
 *   description: Job Postings and Certificates management API
 */
/**
 * @swagger
 * /api/career/jobs:
 *   get:
 *     summary: Get all job postings
 *     tags: [Career]
 *     responses:
 *       200:
 *         description: List of job postings
 *   post:
 *     summary: Create a job posting
 *     tags: [Career]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Job posting created
 *
 * /api/career/certificates:
 *   get:
 *     summary: Get all certificates
 *     tags: [Career]
 *     responses:
 *       200:
 *         description: List of certificates
 */
router.get('/jobs', getJobPostings);
router.post('/jobs', createJobPosting);
router.get('/certificates', getCertificates);

// Admin UI routes
router.get('/job-postings', getHrJobPostings);
router.post('/job-postings', createHrJobPosting);
router.put('/job-postings/:id', updateHrJobPosting);
router.delete('/job-postings/:id', deleteHrJobPosting);

export default router;
