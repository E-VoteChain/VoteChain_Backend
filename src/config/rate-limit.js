import { rateLimit } from 'express-rate-limit';
import { TOO_MANY_REQUESTS } from '../constants/index.js';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.path.startsWith('/health'),
  handler: (req, res) => {
    res.status(TOO_MANY_REQUESTS).json({
      status: TOO_MANY_REQUESTS,
      message: 'Too many requests, please try again later.',
      data: null,
      errors: null,
      timestamp: new Date().toISOString(),
    });
  },
});

export default limiter;
