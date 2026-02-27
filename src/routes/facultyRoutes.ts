import { Router } from 'express';
import { getFaculties, createFaculty, updateFaculty, deleteFaculty } from '../controllers/facultyController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

const authorizedRoles = authorizeRoles('ADMIN', 'HR', 'STUDY_OFFICE');

/**
 * @swagger
 * tags:
 *   name: Faculties
 *   description: Faculty management API
 */

router.get('/', authenticateToken, authorizedRoles, getFaculties);
router.post('/', authenticateToken, authorizedRoles, createFaculty);
router.put('/:id', authenticateToken, authorizedRoles, updateFaculty);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN', 'HR'), deleteFaculty);

export default router;
