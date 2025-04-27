import { formatError, upload_to_cloudinary } from '../utils/helper.js';
import { register_user, updateUserSchema } from '../validations/index.js';
import AppError from '../utils/AppError.js';
import { BAD_REQUEST, CREATED, INTERNAL_SERVER, OK } from '../constants/index.js';
import logger from '../config/logger.js';
import {
  getUserById,
  getUserByWalletAddress,
  getUserDetails,
  saveUser,
  update_user,
  update_user_location,
} from '../services/auth.services.js';
import { generateToken } from '../utils/user.js';
import env from '../config/env.js';

export const register = async (req, res, next) => {
  try {
    const { wallet_address } = register_user.parse(req.body);

    const existing_user = await getUserByWalletAddress(wallet_address, 'id wallet_address role');

    if (existing_user) {
      const access_token = generateToken({
        user_id: existing_user.id,
        wallet_address: existing_user.wallet_address,
        status: existing_user.status,
        role: existing_user.role === 'ADMIN' ? 'admin' : 'user',
      });

      let profile_completed = true;

      const user_details = await getUserDetails(
        existing_user.id,
        'first_name last_name phone_number email'
      );

      if (user_details === null) {
        profile_completed = false;
      }

      res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return res.status(CREATED).json({
        profile_completed: profile_completed,
      });
    }

    const user = {
      wallet_address: wallet_address,
    };

    saveUser(user)
      .then(async (saved_user) => {
        const access_token = generateToken({
          user_id: saved_user.id,
          wallet_address: saved_user.wallet_address,
          role: saved_user.role === 'ADMIN' ? 'admin' : 'user',
          status: saved_user.status,
        });

        res.cookie('access_token', access_token, {
          httpOnly: true,
          secure: env.NODE_ENV === 'production',
          sameSite: 'strict',
        });

        return res.status(CREATED).json({
          profile_completed: false,
        });
      })
      .catch((error) => {
        logger.error('Error while creating user', error);
        return next(new AppError('Something went wrong', INTERNAL_SERVER));
      });
  } catch (error) {
    console.log('error', error);
    if (error instanceof Error) {
      const error = formatError(error);
      return next(new AppError(error, BAD_REQUEST));
    }

    logger.error('Error while creating user', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};

export const update_profile = async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      phone_number,
      email,
      state_id,
      mandal_id,
      district_id,
      constituency_id,
    } = updateUserSchema.parse(req.body);
    const { user_id } = req.user;
    let image_url = null;

    const user = await getUserById(user_id, 'id');

    if (!user) {
      return next(new AppError('User not found', BAD_REQUEST));
    }

    if (req.file) {
      const file_buffer = req.file.buffer;
      image_url = await upload_to_cloudinary(file_buffer);
    }

    const location_payload = {
      state_id,
      district_id,
      mandal_id,
      constituency_id,
    };

    const user_payload = {
      first_name: first_name,
      last_name: last_name,
      phone_number: phone_number,
      email: email,
      profile_image: image_url,
    };
    update_user_location(user.id, location_payload).then(async () => {
      await update_user(user.id, user_payload)
        .then((saved_user) => {
          return res.status(CREATED).json({
            message: 'User updated successfully',
            data: saved_user,
          });
        })
        .catch((error) => {
          logger.error('Error while updating user', error);
          return next(new AppError('Something went wrong', INTERNAL_SERVER));
        });
    });
  } catch (error) {
    if (error instanceof Error) {
      const parsedError = formatError(error);
      return next(new AppError(parsedError, BAD_REQUEST));
    }

    logger.error('Error while updating user', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};

export const decode_jwt = async (req, res, next) => {
  try {
    const { user_id, wallet_address, role, status } = req.user;

    const userDetails = await getUserDetails(user_id, 'first_name last_name phone_number email');

    const user = {
      ...userDetails,
      wallet_address,
      role,
      status,
    };

    return res.status(OK).json({
      message: 'User decoded successfully',
      data: user,
    });
  } catch (error) {
    console.log('error', error);
    logger.error('Error while updating user', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie('access_token');
    return res.status(OK).json({
      message: 'User logged out successfully',
    });
  } catch (error) {
    logger.error('Error while logging out user', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};
