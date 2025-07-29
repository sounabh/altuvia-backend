// routes/programRoutes.js
/*import { Router } from 'express';
const router = Router();
import programController from '../controllers/ProgramController.js';

const {
  getAllPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  uploadSyllabus,
  getSyllabus,
  deleteSyllabus,
  addRanking,
  getRankings,
  updateRanking,
  deleteRanking,
  addExternalLink,
  getExternalLinks,
  updateExternalLink,
  deleteExternalLink
} = programController;


// Program CRUD Routes
router.get('/', getAllPrograms);           // GET /programs - List with filters
router.get('/:id', getProgramById);       // GET /programs/:id - Single program
router.post('/', createProgram);          // POST /programs - Create new
router.put('/:id', updateProgram);        // PUT /programs/:id - Update
router.delete('/:id', deleteProgram);     // DELETE /programs/:id - Delete

// Department CRUD Routes
router.get('/departments', getAllDepartments);
router.get('/departments/:id', getDepartmentById);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// Syllabus Routes
router.post('/:id/syllabus', uploadSyllabus);      // Upload syllabus
router.get('/:id/syllabus', getSyllabus);          // Get syllabus
router.delete('/:id/syllabus', deleteSyllabus);    // Delete syllabus

// Rankings Routes
router.post('/:id/rankings', addRanking);          // Add ranking
router.get('/:id/rankings', getRankings);          // Get rankings
router.put('/rankings/:rankingId', updateRanking); // Update ranking
router.delete('/rankings/:rankingId', deleteRanking);

// External Links Routes
router.post('/:id/links', addExternalLink);        // Add link
router.get('/:id/links', getExternalLinks);        // Get links
router.put('/links/:linkId', updateExternalLink);  // Update link
router.delete('/links/:linkId', deleteExternalLink);

export default router;*/