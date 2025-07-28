import { Router } from 'express';
import { completeUserProfile } from '../controllers/userController.js';
const router = Router();




// POST /api/user/complete-profile
router.post('/complete-profile', completeUserProfile);

export default router;

