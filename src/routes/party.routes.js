import express from 'express';
import { add_members, update_party, verify_party_link } from '../controllers/party.controller.js';
import { attachParty, attachUser, isPartyHead, verifyToken } from '../middlewares/auth.js';
import multer from 'multer';

const router = express.Router();

const Storage = multer.memoryStorage();
const upload = multer({
  storage: Storage,
});
router.get('/create/', verify_party_link);
router.post('/update/', verifyToken, attachUser, upload.single('party_image'), update_party);
router.post('/add-member', verifyToken, attachUser, isPartyHead, attachParty, add_members);
export default router;
