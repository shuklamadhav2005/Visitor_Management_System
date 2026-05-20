import { Router } from 'express';
import {
	createManagedUser,
	deleteManagedUser,
	listUsers,
	updateManagedUser,
} from '../controllers/adminController.js';
import { allowRoles, protect } from '../middleware/auth.js';

const router = Router();

router.use(protect, allowRoles('admin'));

router.get('/users', listUsers);
router.post('/users', createManagedUser);
router.put('/users/:id', updateManagedUser);
router.delete('/users/:id', deleteManagedUser);

export default router;