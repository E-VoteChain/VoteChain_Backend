import express from 'express';
import {
  add_members,
  approve_user,
  get_all_parties,
  get_party_by_token,
  join_party,
  update_party,
  verify_party_link,
  get_party_by_wallet_id,
  get_party_members,
  reject_user,
} from '../controllers/party.controller.js';
import { attachParty, attachUser, isPartyHead, verifyToken } from '../middlewares/auth.js';
import multer from 'multer';

const router = express.Router();

const Storage = multer.memoryStorage();
const upload = multer({
  storage: Storage,
});
router.post('/verify/', verifyToken, attachUser, verify_party_link);
router.post('/update/', verifyToken, attachUser, upload.single('partyImage'), update_party);
router.post('/add-member', verifyToken, attachUser, isPartyHead, attachParty, add_members);
router.get('/get_parties', verifyToken, attachUser, get_all_parties);
router.post('/join-party', verifyToken, attachUser, join_party);
router.get('/get_party', verifyToken, attachUser, get_party_by_wallet_id);
router.get('/details_by_token', verifyToken, attachUser, get_party_by_token);
router.post('/approve-user', verifyToken, attachUser, isPartyHead, attachParty, approve_user);
router.post('/reject-user', verifyToken, attachUser, isPartyHead, attachParty, reject_user);
router.get('/get_members', verifyToken, isPartyHead, attachUser, attachParty, get_party_members);

export default router;
