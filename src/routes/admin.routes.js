import express from 'express';
import multer from 'multer';
import { isAdmin, verifyToken, attachUser } from '../middlewares/auth.js';

import {
  approve_user,
  reject_user,
  getPendingUsers,
  create_party,
} from '../controllers/admin.controller.js';

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

router.get('/pending_users', verifyToken, attachUser, isAdmin, getPendingUsers);
router.put('/approve_user', verifyToken, attachUser, isAdmin, approve_user);
router.put('/reject_user', verifyToken, attachUser, isAdmin, reject_user);
router.post(
  '/create-party',
  verifyToken,
  attachUser,
  isAdmin,
  upload.single('party_symbol'),
  create_party
);

export default router;
