import express from 'express';
import {
  decode_jwt,
  get_user_details,
  logout,
  register,
  searchUser,
  update_profile,
} from '../controllers/auth.controller.js';
import multer from 'multer';
import { attachUser, isPartyHeadOrAdmin, verifyToken } from '../middlewares/auth.js';

const Storage = multer.memoryStorage();
const upload = multer({
  storage: Storage,
});
const router = express.Router();

router.post('/login', register);
router.put(
  '/update_profile',
  verifyToken,
  upload.fields([{ name: 'profileImage' }, { name: 'aadharImage' }]),
  update_profile
);
router.get('/jwt', verifyToken, decode_jwt);
router.post('/logout', verifyToken, logout);
router.get('/user', verifyToken, attachUser, get_user_details);
router.get('/search', verifyToken, isPartyHeadOrAdmin, attachUser, searchUser);

export default router;
