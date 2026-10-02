import { Router } from 'express';
import { getTags } from '../controllers/tag.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getTags);

export default router;