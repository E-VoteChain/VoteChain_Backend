import express from 'express';
import {
  decode_jwt,
  get_user,
  logout,
  register,
  update_profile,
} from '../controllers/auth.controller.js';
import multer from 'multer';
import { attachUser, verifyToken } from '../middlewares/auth.js';

const Storage = multer.memoryStorage();
const upload = multer({
  storage: Storage,
});
const router = express.Router();

router.post('/login', register);
router.put(
  '/update_profile',
  verifyToken,
  upload.fields([{ name: 'profile_image' }, { name: 'aadhar_image' }]),
  update_profile
);
router.get('/jwt', verifyToken, attachUser, decode_jwt);
router.post('/logout', verifyToken, logout);
router.get('/user', verifyToken, attachUser, get_user);

export default router;
