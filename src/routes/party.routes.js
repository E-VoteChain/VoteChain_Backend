import express from 'express';
import { verify_party_link } from '../controllers/party.controller.js';

const router = express.Router();

router.get('/create/', verify_party_link);

export default router;
