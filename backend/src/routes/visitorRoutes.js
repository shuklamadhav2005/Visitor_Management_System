import { Router } from 'express';
import {
  checkInVisitor,
  checkOutVisitor,
  createVisitor,
  deleteVisitorLog,
  getAllVisitorLogs,
  getRecentVisitors,
  getPendingRequests,
  getVisitorStats,
  listVisitors,
  respondToVisitor,
} from '../controllers/visitorController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', listVisitors);
router.get('/pending', getPendingRequests);
router.get('/stats', getVisitorStats);
router.get('/recent', getRecentVisitors);
router.post('/create', createVisitor);
router.post('/', createVisitor);
router.put('/respond/:id', respondToVisitor);
router.put('/checkin/:id', checkInVisitor);
router.put('/checkout/:id', checkOutVisitor);
router.get('/admin/logs', getAllVisitorLogs);
router.delete('/admin/logs/:id', deleteVisitorLog);

export default router;
