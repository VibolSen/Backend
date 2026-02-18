import { Router } from 'express';
import { 
  getJobPostings, 
  createJobPosting, 
  updateJobPosting, 
  deleteJobPosting,
  getJobApplications,
  updateApplicationStatus,
  submitApplication
} from '../controllers/hrController';

const router = Router();

router.get('/job-postings', getJobPostings);
router.post('/job-postings', createJobPosting);
router.put('/job-postings/:id', updateJobPosting);
router.delete('/job-postings/:id', deleteJobPosting);

// Application Management
router.get('/applications', getJobApplications); // Filter via query params
router.patch('/applications/:id/status', updateApplicationStatus);
router.post('/applications/submit', submitApplication); // Typically public or candidate portal, but can be here too

export default router;
