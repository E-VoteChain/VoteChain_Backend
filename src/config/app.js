import cors from 'cors';
import express from 'express';
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
import { errorHandler } from '../utils/helper.js';
import env from './env.js';

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(
  cors({
    origin: env.cors.origin || 'http://localhost:5173',
    credentials: env.cors.credentials,
  })
);

app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, '../views'));

app.get('/', (req, res) => {
  return res.render('home');
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

app.use(errorHandler);

export default app;
