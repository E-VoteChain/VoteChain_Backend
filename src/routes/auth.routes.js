import express from 'express';
import { register, update_profile } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/login', register);
router.put('/update', update_profile);

export default router;
