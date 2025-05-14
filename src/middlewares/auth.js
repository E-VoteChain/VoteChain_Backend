import env from '../config/env.js';
import { UN_AUTHENTICATED, UN_AUTHORIZED } from '../constants/index.js';
import { getUserDetails } from '../services/auth.services.js';
import { AppError } from '../utils/AppError.js';
import { extractToken } from '../utils/user.js';
import logger from '../config/logger.js';
import { getPartyByUserId } from '../services/party.services.js';

export const verifyToken = async (req, res, next) => {
  const token = req.cookies?.access_token;

  if (!token) {
    return next(new AppError('Authorization token is missing', UN_AUTHORIZED));
  }

  try {
    const decoded = await extractToken(token, env.jwt.access_secret);

    if (!decoded || !decoded.user_id) {
      return next(new AppError('Invalid token payload', UN_AUTHENTICATED));
    }

    console.log('decoded', decoded);
    req.user = decoded;
    return next();
  } catch (err) {
    logger.error('JWT verification failed', err);
    res.clearCookie('access_token');
    return next(new AppError('Token is invalid or expired', UN_AUTHENTICATED));
  }
};

export const attachUser = async (req, res, next) => {
  try {
    const { user_id } = req.user || {};

    if (!user_id) {
      return next(new AppError('No user found in token', UN_AUTHORIZED));
    }

    const user = await getUserDetails(user_id, {
      first_name: true,
      last_name: true,
      email: true,
    });

    if (!user) {
      res.clearCookie('access_token');
      return next(new AppError('User not found', UN_AUTHORIZED));
    }

    req.userDetails = user;
    next();
  } catch (err) {
    logger.error('Error fetching user data', err);
    return next(new AppError('Failed to verify user identity', UN_AUTHORIZED));
  }
};

export const isAdmin = (req, res, next) => {
  const role = req.user?.role;

  if (role !== 'admin') {
    return next(
      new AppError(
        'You do not have the necessary permissions to perform this action',
        UN_AUTHORIZED
      )
    );
  }

  next();
};

export const isPartyHead = (req, res, next) => {
  const role = req.user?.role;
  console.log('role', role);
  if (role !== 'phead') {
    return next(
      new AppError(
        'You do not have the necessary permissions to perform this action',
        UN_AUTHORIZED
      )
    );
  }

  next();
};

export const attachParty = async (req, res, next) => {
  const { user_id } = req.user;

  if (!user_id) {
    return next(new AppError('No user found in token', UN_AUTHORIZED));
  }

  const party = await getPartyByUserId(user_id, { id: true, leader_id: true, name: true });
  if (!party) {
    return next(new AppError('Party not found', UN_AUTHORIZED));
  }

  req.party = party;
  next();
};
