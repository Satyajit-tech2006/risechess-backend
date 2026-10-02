import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../controllers/student.controller';
import {
  adjustStudentCredits,
  getStudentCreditHistory,
} from '../controllers/credit.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';

const router = Router();

router.use(authenticate);

// Core Student CRUD
router.get('/', requirePermission('MANAGE_STUDENTS'), getStudents);
router.post('/', requirePermission('MANAGE_STUDENTS'), createStudent);
router.get('/:id', requirePermission('MANAGE_STUDENTS'), getStudentById);
router.patch('/:id', requirePermission('MANAGE_STUDENTS'), updateStudent);
router.delete('/:id', requirePermission('MANAGE_STUDENTS'), deleteStudent);

// Class Credits & Attendance Audit
router.post('/:id/classes', requirePermission('MANAGE_STUDENTS'), adjustStudentCredits);
router.get('/:id/classes/history', requirePermission('MANAGE_STUDENTS'), getStudentCreditHistory);

export default router;