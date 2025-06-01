import cors from 'cors';
import express from 'express';
import process from 'process';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import * as path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import logger from './logger.js';

import authRoutes from '../routes/auth.routes.js';
import adminRoutes from '../routes/admin.routes.js';
import locationRoutes from '../routes/location.routes.js';
import partyRoutes from '../routes/party.routes.js';
import electionRoutes from '../routes/election.routes.js';
import { errorHandler } from '../utils/helper.js';
import env from './env.js';
import limiter from './rate-limit.js';

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);
app.use(morgan('dev'));

app.use(
  cors({
    origin: env.cors.origin || 'http://localhost:5173',
    credentials: env.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'User-Agent',
    ],
    exposedHeaders: ['Content-Length', 'X-Requested-With', 'Accept', 'Origin', 'User-Agent'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
  })
);

app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, '../views'));

app.get('/', (req, res) => {
  return res.render('home');
});

app.get('/health', (_req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    responsetime: process.hrtime(),
    message: 'OK',
    timeStamp: Date.now(),
  };

  try {
    res.send(healthCheck);
  } catch {
    healthCheck.message = 'Error';
    res.status(503).send();
  }
});

if (env.env !== 'production') {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
  });
}

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/location', locationRoutes);
app.use('/api/v1/party', partyRoutes);
app.use('/api/v1/election', electionRoutes);
app.use(errorHandler);
export default app;
