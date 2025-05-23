import env from '../config/env.js';
import { UN_AUTHENTICATED, FORBIDDEN, UN_AUTHORIZED } from '../constants/index.js';
import { getUserById, getUserDetails } from '../services/auth.services.js';
import { AppError } from '../utils/AppError.js';
import { extractToken } from '../utils/user.js';
import logger from '../config/logger.js';

const ROLE_ADMIN = 'ADMIN';
const ROLE_PHEAD = 'PHEAD';

export const verifyToken = async (req, res, next) => {
  const token = req.cookies?.access_token;

  if (!token) {
    return next(new AppError('Authorization token is missing', FORBIDDEN));
  }

  try {
    const decoded = await extractToken(token, env.jwt.access_secret);

    if (!decoded?.userId) {
      return next(new AppError('Invalid token payload', UN_AUTHENTICATED));
    }

    req.user = decoded;
    next();
  } catch (err) {
    logger.error('JWT verification failed', err);
    res.clearCookie('access_token');
    return next(new AppError('Token is invalid or expired', UN_AUTHENTICATED));
  }
};

export const attachUser = async (req, res, next) => {
  try {
    const { userId } = req.user || {};

    if (!userId) {
      return next(new AppError('No user found in token', FORBIDDEN));
    }

    const user = await getUserDetails(userId, {
      firstName: true,
      lastName: true,
      phoneNumber: true,
      email: true,
      dob: true,
      profileImage: true,
      aadharImage: true,
      aadharNumber: true,
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
  if (req.user?.role !== ROLE_ADMIN) {
    return next(new AppError('Only admin can perform this action', FORBIDDEN));
  }

  next();
};

export const isPartyHead = (req, res, next) => {
  if (req.user?.role !== ROLE_PHEAD) {
    return next(new AppError('Only party heads can perform this action', FORBIDDEN));
  }

  next();
};

export const attachParty = async (req, res, next) => {
  try {
    const { userId } = req.user;

    if (!userId) {
      return next(new AppError('No user found in token', FORBIDDEN));
    }

    const user = await getUserById(userId, {
      partyMembers: {
        select: {
          party: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    });

    const formattedParty = user.partyMembers[0].party || null;

    if (!formattedParty) {
      return next(new AppError('Party not found for this user', UN_AUTHORIZED));
    }

    req.party = formattedParty;
    next();
  } catch (err) {
    logger.error('Error attaching party info', err);
    return next(new AppError('Failed to attach party data', UN_AUTHORIZED));
  }
};

export const isPartyHeadOrAdmin = (req, res, next) => {
  const { role } = req.user || {};
  const { party } = req;

  if (role !== ROLE_ADMIN && (!party || party.leaderId !== req.user.userId)) {
    return next(new AppError('Only admin or party head can perform this action', FORBIDDEN));
  }

  next();
};
