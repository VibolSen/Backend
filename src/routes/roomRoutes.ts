import { Router } from 'express';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../controllers/roomController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Room
 *   description: Room/Location management API
 */

router.get('/', getRooms);
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

export default router;
