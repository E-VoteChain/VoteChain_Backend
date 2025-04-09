import express from 'express';
import { isAdmin, verify_token } from '../middlewares/auth.js';
import { approve_user, get_users, reject_user } from '../controllers/admin.controller.js';
const router = express.Router();

router.put('/approve', verify_token, isAdmin, approve_user);
router.put('/reject',verify_token, isAdmin, reject_user);
router.get('/users', verify_token, isAdmin, get_users);

export default router;
