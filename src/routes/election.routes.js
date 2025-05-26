import express from 'express';
import {
  add_candidates,
  cast_vote,
  create_election,
  get_election_by_id,
  get_elections,
  get_elections_by_constituency,
} from '../controllers/election.controller.js';
import { attachUser, isAdmin, verifyToken } from '../middlewares/auth.js';

const router = express.Router();

router.post('/create', verifyToken, isAdmin, attachUser, create_election);
router.post('/add-candidates', verifyToken, isAdmin, attachUser, add_candidates);
router.post('/cast-vote', verifyToken, attachUser, cast_vote);
router.get('/get-elections', verifyToken, isAdmin, attachUser, get_elections);
router.get('/get-elections/constituency', verifyToken, attachUser, get_elections_by_constituency);
router.get('/get-election', verifyToken, attachUser, get_election_by_id);

export default router;
