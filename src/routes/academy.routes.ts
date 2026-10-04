import { Router } from 'express';
import {
  getAcademyProfile,
  updateAcademyProfile,
  getAcademyStats,
} from '../controllers/academy.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Profile
router.get('/profile', getAcademyProfile);
router.patch('/profile', (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ status: 'error', message: 'Only Admins can update academy profile' });
    return;
  }
  next();
}, updateAcademyProfile);

// Quick overview stats
router.get('/stats', getAcademyStats);

export default router;