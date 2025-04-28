import express from 'express';
import { isAdmin, verify_token, verify_user } from '../middlewares/auth.js';
import {
  approve_user,
  getPendingUsers,
  get_users,
  reject_user,
} from '../controllers/admin.controller.js';
const router = express.Router();

router.put('/approve', verify_token, isAdmin, approve_user);
router.put('/reject', verify_token, isAdmin, reject_user);
router.get('/users', verify_token, isAdmin, get_users);
// router.post('/create-election', verify_token, isAdmin, create_election
router.get('/pending_users', verify_token, verify_user, isAdmin, getPendingUsers);

export default router;
