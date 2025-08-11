import { Router } from 'express';
import { extractUserIdFromToken } from '../middleware/userMiddleware.js';
import { getProgramDetails, getSavedUniversities, getUniversityBySlug, getUniversityDepartments, getUniversityPrograms, toggleAdded } from '../controllers/universityController.js';


const router = Router();

// ===================================
// UNI ROUTES - 
// ===================================

router.post("/toggleSaved", extractUserIdFromToken, toggleAdded);
router.get("/saved", extractUserIdFromToken, getSavedUniversities);

// Departments
router.get('/:slug/departments', getUniversityDepartments);

// Programs
router.get('/:slug/programs/:programId', getProgramDetails);
router.get('/:slug/programs', getUniversityPrograms);

// Generic university
router.get('/:slug', getUniversityBySlug);

export default router;

