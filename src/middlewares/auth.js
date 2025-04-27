import env from '../config/env.js';
import { UN_AUTHENTICATED, UN_AUTHORIZED } from '../constants/index.js';
import { getUserById } from '../services/auth.services.js';
import AppError from '../utils/AppError.js';
import { extractUser } from '../utils/user.js';

export const verify_token = async (req, res, next) => {
  const token = req.cookies.access_token;

  if (!token) {
    return next(new AppError('No Authorization token found', UN_AUTHORIZED));
  }

  try {
    const decodedUser = await extractUser(token, env.jwt.access_secret);
    req.user = decodedUser;
    return next();
  } catch (error) {
    console.log('error', error);
    return next(new AppError('Invalid token', UN_AUTHENTICATED));
  }
};

export const verify_user = async (req, res, next) => {
  const { user_id } = req.user;

  if (!user_id) {
    return next(new AppError('User not found', UN_AUTHORIZED));
  }

  const user = await getUserById(user_id, 'id');

  if (!user) {
    res.clearCookie('access_token');
    return next(new AppError('User not found', UN_AUTHORIZED));
  }
  return next();
};

export const isAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('You are not authorized to perform this action', UN_AUTHORIZED));
  }

  return next();
};
