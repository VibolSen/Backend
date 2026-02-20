import { Router } from 'express';
import { getAdminStats, getTeacherStats, getStudentStats, getHRStats, getStudentsPerformance, getStudyOfficeStats } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
// ... (swagger docs simplified in diff)
router.get('/admin', getAdminStats);
router.get('/hr', getHRStats);
router.get('/teacher', getTeacherStats);
router.get('/student', getStudentStats);
router.get('/study-office', getStudyOfficeStats);
router.get('/student-performance', getStudentsPerformance);

export default router;
