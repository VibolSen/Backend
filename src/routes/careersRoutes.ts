import { Router } from 'express';
import { 
  getJobPostings, 
  getJobPostingById, 
  submitApplication 
} from '../controllers/careersController';

const router = Router();

router.get('/job-postings', getJobPostings);
router.get('/job-postings/:id', getJobPostingById);
router.post('/applications', submitApplication);

export default router;
