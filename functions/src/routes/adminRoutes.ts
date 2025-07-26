import { Router } from 'express';
import { checkAdminStatus, assignAdminRole } from '../controllers/adminController';

const router = Router();

router.get('/is-admin/:uid', checkAdminStatus);
router.post('/assign-admin', assignAdminRole);

export default router;
