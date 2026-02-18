import { Router } from 'express';
import { Request, Response } from 'express';

/**
 * @swagger
 * tags:
 *   name: Utils
 *   description: Utility and status endpoints
 */

/**
 * @swagger
 * /api/utils/statuses:
 *   get:
 *     summary: Get academic/submission statuses
 *     tags: [Utils]
 *     responses:
 *       200:
 *         description: List of statuses
 *
 * /api/utils/attendance-statuses:
 *   get:
 *     summary: Get attendance statuses
 *     tags: [Utils]
 *     responses:
 *       200:
 *         description: List of attendance statuses
 *
 * /api/utils/roles:
 *   get:
 *     summary: Get all user roles
 *     tags: [Utils]
 *     responses:
 *       200:
 *         description: List of roles
 */
const router = Router();
router.get('/statuses', (req: Request, res: Response) => {
    // Return generic statuses
    res.json([
        { id: 'PENDING', name: 'Pending' },
        { id: 'SUBMITTED', name: 'Submitted' },
        { id: 'GRADED', name: 'Graded' }
    ]);
});

router.get('/attendance-statuses', (req: Request, res: Response) => {
    res.json([
        { id: 'PRESENT', name: 'Present' },
        { id: 'ABSENT', name: 'Absent' },
        { id: 'LATE', name: 'Late' }
    ]);
});

router.get('/roles', (req: Request, res: Response) => {
    res.json(['ADMIN', 'HR', 'TEACHER', 'STUDENT', 'STUDY_OFFICE']);
});

import { upload, uploadToCloudinary } from '../middleware/upload';

// File Upload Route
router.post('/upload', upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Upload buffer to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'school-management/uploads');
    
    // Return the Cloudinary URL
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: 'Upload failed', message: err.message });
  }
});

export default router;
