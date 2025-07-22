import { Router } from 'express';
import { checkAdminStatus, assignAdminRole } from '../controllers/adminController';

export const router = Router();


router.get('/is-admin/:uid', checkAdminStatus);        // ✅ SIN /api/
router.post('/assign-admin', assignAdminRole);         // ✅ SIN /api/


export default router;
