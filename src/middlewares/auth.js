import env from '../config/env.js';
import { UN_AUTHENTICATED, UN_AUTHORIZED } from '../constants/index.js';
import AppError from '../utils/AppError.js';
import { extractUser } from '../utils/user.js';

export const verify_token = async (req, res, next) => {
  const token = req.cookies.access_token;

  if (!token) {
    next(
      new AppError(
        {
          message: 'No Authorization token found',
        },
        UN_AUTHORIZED
      )
    );
  }

  try {
    const decodedUser = await extractUser(token, env.jwt.access_secret);
    console.log('decodedUser', decodedUser);
    req.user = decodedUser;
    return next();
  } catch (error) {
    console.log('error', error);
    next(
      new AppError(
        {
          message: 'Invalid token',
        },
        UN_AUTHENTICATED
      )
    );
  }
};

export const isUser = async (req, res, next) => {
  if (req.user.role !== 'voter') {
    next(
      new AppError(
        {
          message: 'You are not authorized to perform this action',
        },
        UN_AUTHORIZED
      )
    );
  }

  return next();
};

export const isAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    next(
      new AppError(
        {
          message: 'You are not authorized to perform this action',
        },
        UN_AUTHORIZED
      )
    );
  }

  return next();
};
