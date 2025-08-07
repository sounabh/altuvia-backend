import { Router } from 'express';
import { extractUserIdFromToken } from '../middleware/userMiddleware.js';
import { getSavedUniversities, getUniversityBySlug, toggleAdded } from '../controllers/universityController.js';


const router = Router();

// ===================================
// UNI ROUTES - 
// ===================================


router.post("/toggleSaved",extractUserIdFromToken,toggleAdded)
router.get("/saved", extractUserIdFromToken, getSavedUniversities); // New route
router.get('/:slug',getUniversityBySlug);

export default router;

