import { Router } from 'express';
import { 
  getJobPostings, 
  createJobPosting, 
  updateJobPosting, 
  deleteJobPosting 
} from '../controllers/hrController';

const router = Router();

router.get('/job-postings', getJobPostings);
router.post('/job-postings', createJobPosting);
router.put('/job-postings/:id', updateJobPosting);
router.delete('/job-postings/:id', deleteJobPosting);

export default router;
