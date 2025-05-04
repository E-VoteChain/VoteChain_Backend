import express from 'express';
import { isAdmin, verifyToken, attachUser } from '../middlewares/auth.js';
import { approve_user, getPendingUsers, reject_user } from '../controllers/admin.controller.js';
const router = express.Router();

router.get('/pending_users', verifyToken, attachUser, isAdmin, getPendingUsers);
router.put('/approve_user', verifyToken, isAdmin, approve_user);
router.put('/reject_user', verifyToken, attachUser, isAdmin, reject_user);
// router.post('/create-election', verify_token, isAdmin, create_election

export default router;
