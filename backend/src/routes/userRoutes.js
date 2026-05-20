import { Router } from 'express';
import { allowRoles, protect } from '../middleware/auth.js';
import { listResidents } from '../controllers/adminController.js';

const router = Router();

router.use(protect, allowRoles('security', 'admin'));

router.get('/residents', listResidents);

export default router;