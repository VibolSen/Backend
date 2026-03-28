import { Router } from 'express';
import { getStudentCertifications, issueDegreeCertificate } from '../controllers/certificationController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.get('/eligibility/:studentId', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE', 'STUDENT'), getStudentCertifications);
router.post('/issue', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), issueDegreeCertificate);

export default router;
