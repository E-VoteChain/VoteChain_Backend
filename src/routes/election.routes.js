import express from 'express';
import {
  add_candidates,
  cast_vote,
  create_election,
  get_elections,
} from '../controllers/election.controller.js';
import { attachUser, isAdmin, verifyToken } from '../middlewares/auth.js';

const router = express.Router();

router.post('/create', verifyToken, isAdmin, attachUser, create_election);
router.post('/add-candidates', verifyToken, isAdmin, attachUser, add_candidates);
router.post('/cast-vote', verifyToken, attachUser, cast_vote);
router.get('/get-elections', verifyToken, isAdmin, attachUser, get_elections);

export default router;
