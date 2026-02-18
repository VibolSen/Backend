import { Router } from 'express';
import { 
  createLeaveRequest, 
  getMyLeaveRequests, 
  getAllLeaveRequests, 
  updateLeaveStatus,
  getLeaveBalances
} from '../controllers/leaveController';
import { authenticateToken, authorizeRoles } from '../middleware/auth'; 

const router = Router();

// Routes for all authenticated users (Staff/Teachers)
router.post('/request', authenticateToken, createLeaveRequest);
router.get('/my-requests', authenticateToken, getMyLeaveRequests);
router.get('/balances', authenticateToken, getLeaveBalances);

// Routes for HR/Admin
router.get('/all', authenticateToken, authorizeRoles('ADMIN', 'HR'), getAllLeaveRequests);
router.put('/:id/status', authenticateToken, authorizeRoles('ADMIN', 'HR'), updateLeaveStatus);

export default router;
