import { Router } from 'express';
import {
    getBatches,
    createBatch,
    updateBatch,
    deleteBatch,
    promoteBatchYear,
    updateBatchStudentsStatus
} from '../controllers/batchController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getBatches);
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), createBatch);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), updateBatch);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), deleteBatch);

// Bulk actions
router.post('/:id/promote', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), promoteBatchYear);
router.post('/:id/status', authenticateToken, authorizeRoles('ADMIN', 'STUDY_OFFICE'), updateBatchStudentsStatus);

export default router;
