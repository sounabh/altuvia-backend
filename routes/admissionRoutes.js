// routes/admissions.js
const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admissionController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ========== ADMISSION ROUTES ==========

// Get all admissions with filtering and pagination
router.get('/', admissionController.getAllAdmissions);

// Get admission by ID with full details
router.get('/:id', admissionController.getAdmissionById);

// Get admissions by university
router.get('/university/:universityId', admissionController.getAdmissionsByUniversity);

// Get admissions by program
router.get('/program/:programId', admissionController.getAdmissionsByProgram);

// Create new admission (Admin only)
router.post('/', authenticateToken, requireAdmin, admissionController.createAdmission);

// Update admission (Admin only)
router.put('/:id', authenticateToken, requireAdmin, admissionController.updateAdmission);

// Delete admission (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, admissionController.deleteAdmission);

// Toggle admission status (Admin only)
router.patch('/:id/status', authenticateToken, requireAdmin, admissionController.toggleAdmissionStatus);

// ========== INTAKE ROUTES ==========

// Get all intakes for an admission
router.get('/:admissionId/intakes', admissionController.getIntakesByAdmission);

// Create new intake (Admin only)
router.post('/:admissionId/intakes', authenticateToken, requireAdmin, admissionController.createIntake);

// Update intake (Admin only)
router.put('/:admissionId/intakes/:intakeId', authenticateToken, requireAdmin, admissionController.updateIntake);

// Delete intake (Admin only)
router.delete('/:admissionId/intakes/:intakeId', authenticateToken, requireAdmin, admissionController.deleteIntake);

// ========== DEADLINE ROUTES ==========

// Get all deadlines for an admission
router.get('/:admissionId/deadlines', admissionController.getDeadlinesByAdmission);

// Create new deadline (Admin only)
router.post('/:admissionId/deadlines', authenticateToken, requireAdmin, admissionController.createDeadline);

// Update deadline (Admin only)
router.put('/:admissionId/deadlines/:deadlineId', authenticateToken, requireAdmin, admissionController.updateDeadline);

// Delete deadline (Admin only)
router.delete('/:admissionId/deadlines/:deadlineId', authenticateToken, requireAdmin, admissionController.deleteDeadline);

// ========== APPLICATION ROUTES ==========

// Get applications for an admission (Admin only)
router.get('/:admissionId/applications', authenticateToken, requireAdmin, admissionController.getApplicationsByAdmission);

// Create new application (Public)
router.post('/:admissionId/applications', admissionController.createApplication);

// Get user's applications (Authenticated users)
router.get('/user/applications', authenticateToken, admissionController.getUserApplications);

// Update application status (Admin only)
router.patch('/:admissionId/applications/:applicationId/status', authenticateToken, requireAdmin, admissionController.updateApplicationStatus);

// ========== UTILITY ROUTES ==========

// Get admission statistics
router.get('/:admissionId/statistics', admissionController.getAdmissionStatistics);

// Get upcoming deadlines
router.get('/deadlines/upcoming', admissionController.getUpcomingDeadlines);

// Get active intakes
router.get('/intakes/active', admissionController.getActiveIntakes);

// Check eligibility
router.post('/check-eligibility', admissionController.checkEligibility);

module.exports = router;