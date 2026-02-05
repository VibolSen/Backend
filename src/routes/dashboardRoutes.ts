import { Router } from 'express';
import { getAdminStats, getTeacherStats, getStudentStats, getHRStats, getStudentsPerformance } from '../controllers/dashboardController';

const router = Router();
// ... (swagger docs simplified in diff)
router.get('/admin', getAdminStats);
router.get('/hr', getHRStats);
router.get('/teacher', getTeacherStats);
router.get('/student', getStudentStats);
router.get('/student-performance', getStudentsPerformance);

export default router;
