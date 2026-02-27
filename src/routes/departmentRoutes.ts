import { Router } from 'express';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/departmentController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

const authorizedRoles = authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE');

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Department management API
 */

router.get('/', authenticateToken, authorizedRoles, getDepartments);
router.post('/', authenticateToken, authorizedRoles, createDepartment);
router.put('/:id', authenticateToken, authorizedRoles, updateDepartment);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN', 'HR'), deleteDepartment);

export default router;
