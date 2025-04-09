import express from 'express';
import { register, update_profile } from '../controllers/auth.controller.js';
import multer from 'multer';
import { verify_token } from '../middlewares/auth.js';

const Storage = multer.memoryStorage();
const upload = multer({
  storage: Storage,
});
const router = express.Router();

router.post('/login', register);
router.put('/update', verify_token, upload.single('profile_image'), update_profile);

export default router;
