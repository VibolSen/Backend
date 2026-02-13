import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController';

const router = Router();

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.post('/mark-all-read', markAllAsRead);

export default router;
