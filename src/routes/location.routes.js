import express from 'express';
import {
  getState,
  getDistrict,
  getConstituency,
  getMandal,
} from '../controllers/location.controller.js';
const app = express.Router();

app.get('/state', getState);
app.get('/district/:state_id', getDistrict);
app.get('/mandal/:district_id', getMandal);
app.get('/constituency/:mandal_id', getConstituency);

export default app;
