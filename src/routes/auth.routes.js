import express from 'express';
import { decode_jwt, logout, register, update_profile } from '../controllers/auth.controller.js';
import multer from 'multer';
import { verify_token } from '../middlewares/auth.js';

const Storage = multer.memoryStorage();
const upload = multer({
  storage: Storage,
});
const router = express.Router();

router.post('/login', register);
router.put('/update_profile', verify_token, upload.single('profile_image'), update_profile);
router.get('/jwt', verify_token, decode_jwt);
router.post('/logout', verify_token, logout);

export default router;
