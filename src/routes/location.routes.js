import express from 'express';
import {
  getState,
  getDistrict,
  getConstituency,
  getMandal,
} from '../controllers/location.controller.js';
const app = express.Router();

app.get('/states', getState);
app.get('/districts/:state_id', getDistrict);
app.get('/mandals/:district_id', getMandal);
app.get('/constituencies/:mandal_id', getConstituency);

export default app;
