import { Router } from 'express';
import {
  getBatches,
  createBatch,
  updateBatch,
  addStudentToBatch,
  removeStudentFromBatch,
} from '../controllers/batch.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// List batches (Admins get all, coaches get their assigned cohorts)
router.get('/', getBatches);

// Create batch
router.post('/', createBatch);

// Edit batch details (Name)
router.patch('/:id', updateBatch);

// Enroll student
router.post('/:id/students', addStudentToBatch);

// Remove student from batch
router.delete('/:id/students/:studentId', removeStudentFromBatch);

export default router;