import { Router } from 'express';
import { 
  getJobPostings, 
  getJobPostingById, 
  submitApplication,
  upload
} from '../controllers/careersController';

const router = Router();

router.get('/job-postings', getJobPostings);
router.get('/job-postings/:id', getJobPostingById);
router.post('/applications', upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'coverLetter', maxCount: 1 },
]), submitApplication);

export default router;
