import { Router } from 'express';
import { getCoaches, createCoach, updateCoachPermissions } from '../controllers/coach.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Only ADMIN should manage coaches
router.use((req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ status: 'error', message: 'Admin access required' });
    return;
  }
  next();
});

router.get('/', getCoaches);
router.post('/', createCoach);
router.patch('/:id/permissions', updateCoachPermissions);

export default router;