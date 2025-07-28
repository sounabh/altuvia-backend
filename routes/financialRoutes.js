// routes/financial.js
const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateFinancialData } = require('../middleware/validation');

// ========== TUITION BREAKDOWN ROUTES ==========

// Get tuition breakdown for a university/program
router.get('/tuition-breakdown/:universityId', financialController.getTuitionBreakdown);
router.get('/tuition-breakdown/:universityId/:programId', financialController.getTuitionBreakdown);

// Get tuition breakdown by academic year
router.get('/tuition-breakdown/:universityId/year/:academicYear', financialController.getTuitionBreakdownByYear);

// Create tuition breakdown (Admin only)
router.post('/tuition-breakdown', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  validateFinancialData('tuitionBreakdown'),
  financialController.createTuitionBreakdown
);

// Update tuition breakdown (Admin only)
router.put('/tuition-breakdown/:id', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  validateFinancialData('tuitionBreakdown'),
  financialController.updateTuitionBreakdown
);

// Delete tuition breakdown (Admin only)
router.delete('/tuition-breakdown/:id', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  financialController.deleteTuitionBreakdown
);

// Get payment schedule for tuition breakdown
router.get('/payment-schedule/:tuitionBreakdownId', financialController.getPaymentSchedule);

// Create payment schedule (Admin only)
router.post('/payment-schedule', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  validateFinancialData('paymentSchedule'),
  financialController.createPaymentSchedule
);

// ========== SCHOLARSHIP ROUTES ==========

// Get all scholarships for a university
router.get('/scholarships/:universityId', financialController.getScholarships);

// Get scholarship by slug
router.get('/scholarship/:universityId/:scholarshipSlug', financialController.getScholarshipBySlug);

// Get scholarship details with documents
router.get('/scholarship/:id/details', financialController.getScholarshipDetails);

// Create scholarship (Admin only)
router.post('/scholarship', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  validateFinancialData('scholarship'),
  financialController.createScholarship
);

// Update scholarship (Admin only)
router.put('/scholarship/:id', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  validateFinancialData('scholarship'),
  financialController.updateScholarship
);

// Delete scholarship (Admin only)
router.delete('/scholarship/:id', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  financialController.deleteScholarship
);

// Upload scholarship document (Admin only)
router.post('/scholarship/:id/document', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  financialController.uploadScholarshipDocument
);

// Download scholarship document
router.get('/scholarship/document/:documentId/download', financialController.downloadScholarshipDocument);

// ========== SCHOLARSHIP APPLICATION ROUTES ==========

// Submit scholarship application
router.post('/scholarship/:scholarshipId/apply', 
  validateFinancialData('scholarshipApplication'),
  financialController.submitScholarshipApplication
);

// Get scholarship applications (Admin only)
router.get('/scholarship/:scholarshipId/applications', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  financialController.getScholarshipApplications
);

// Update scholarship application status (Admin only)
router.put('/scholarship-application/:id/status', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  financialController.updateScholarshipApplicationStatus
);

// Get user's scholarship applications
router.get('/my-scholarship-applications', 
  authenticate, 
  financialController.getUserScholarshipApplications
);

// ========== FEE STRUCTURE ROUTES ==========

// Get fee structure for university/program
router.get('/fee-structure/:universityId', financialController.getFeeStructure);
router.get('/fee-structure/:universityId/:programId', financialController.getFeeStructure);

// Get fee structure by type and year
router.get('/fee-structure/:universityId/:structureType/:academicYear', financialController.getFeeStructureByType);

// Create fee structure (Admin only)
router.post('/fee-structure', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  validateFinancialData('feeStructure'),
  financialController.createFeeStructure
);

// Update fee structure (Admin only)
router.put('/fee-structure/:id', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  validateFinancialData('feeStructure'),
  financialController.updateFeeStructure
);

// Delete fee structure (Admin only)
router.delete('/fee-structure/:id', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  financialController.deleteFeeStructure
);

// ========== FINANCIAL AID ROUTES ==========

// Get financial aids for university/program
router.get('/financial-aid/:universityId', financialController.getFinancialAids);
router.get('/financial-aid/:universityId/:programId', financialController.getFinancialAids);

// Get financial aid details
router.get('/financial-aid/:id/details', financialController.getFinancialAidDetails);

// Create financial aid (Admin only)
router.post('/financial-aid', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  validateFinancialData('financialAid'),
  financialController.createFinancialAid
);

// Update financial aid (Admin only)
router.put('/financial-aid/:id', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  validateFinancialData('financialAid'),
  financialController.updateFinancialAid
);

// Delete financial aid (Admin only)
router.delete('/financial-aid/:id', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  financialController.deleteFinancialAid
);

// ========== FINANCIAL AID APPLICATION ROUTES ==========

// Submit financial aid application
router.post('/financial-aid/:financialAidId/apply', 
  validateFinancialData('financialAidApplication'),
  financialController.submitFinancialAidApplication
);

// Get financial aid applications (Admin only)
router.get('/financial-aid/:financialAidId/applications', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  financialController.getFinancialAidApplications
);

// Update financial aid application status (Admin only)
router.put('/financial-aid-application/:id/status', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  financialController.updateFinancialAidApplicationStatus
);

// Get user's financial aid applications
router.get('/my-financial-aid-applications', 
  authenticate, 
  financialController.getUserFinancialAidApplications
);

// ========== UTILITY ROUTES ==========

// Get complete financial overview for a university/program
router.get('/overview/:universityId', financialController.getFinancialOverview);
router.get('/overview/:universityId/:programId', financialController.getFinancialOverview);

// Get financial calculator data
router.get('/calculator/:universityId', financialController.getFinancialCalculatorData);
router.get('/calculator/:universityId/:programId', financialController.getFinancialCalculatorData);

// Get currency exchange rates
router.get('/currency-rates', financialController.getCurrencyRates);

// Convert currency
router.post('/convert-currency', financialController.convertCurrency);

// Get cost comparison between universities
router.post('/compare-costs', financialController.compareCosts);

// Generate financial report (Admin only)
router.get('/report/:universityId', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  financialController.generateFinancialReport
);

// Export financial data (Admin only)
router.get('/export/:universityId', 
  authenticate, 
  authorize(['ADMIN', 'SUPER_ADMIN']), 
  financialController.exportFinancialData
);

module.exports = router;