import express from 'express';
import { add_candidates, create_election } from '../controllers/election.controller.js';
import { attachUser, isAdmin, verifyToken } from '../middlewares/auth.js';

const router = express.Router();

router.post('/create', verifyToken, isAdmin, attachUser, create_election);
router.post('/add-candidates', verifyToken, isAdmin, attachUser, add_candidates);

export default router;
