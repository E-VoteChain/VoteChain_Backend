import express from 'express';
import { isAdmin, verifyToken, attachUser } from '../middlewares/auth.js';

import {
  approve_user,
  reject_user,
  getPendingUsers,
  create_party,
} from '../controllers/admin.controller.js';

const router = express.Router();

router.get('/pending_users', verifyToken, attachUser, isAdmin, getPendingUsers);
router.put('/approve_user', verifyToken, attachUser, isAdmin, approve_user);
router.put('/reject_user', verifyToken, attachUser, isAdmin, reject_user);
router.post('/create-party', verifyToken, attachUser, isAdmin, create_party);

export default router;
