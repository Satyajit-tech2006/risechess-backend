import { Router } from 'express';
import { getBatches, createBatch, addStudentToBatch } from '../controllers/batch.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('MANAGE_BATCHES'), getBatches);
router.post('/', requirePermission('MANAGE_BATCHES'), createBatch);
router.post('/:id/students', requirePermission('MANAGE_BATCHES'), addStudentToBatch);

export default router;