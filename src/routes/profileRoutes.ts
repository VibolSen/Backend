import { Router } from 'express';
import { updateMyProfile } from '../controllers/profileController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// PUT /api/profile/update
// Uses authenticateToken to get user context
// Uses upload.single('image') to handle file upload (Cloudinary) - Frontend sends 'image'
router.put('/update', authenticateToken, upload.single('image'), updateMyProfile);

export default router;
