import { formatError, generateSlug, upload_to_cloudinary } from '../utils/helper.js';
import { register_user, updateUserSchema } from '../validations/index.js';
import AppError from '../utils/AppError.js';
import { BAD_REQUEST, CREATED, INTERNAL_SERVER } from '../constants/index.js';
import logger from '../config/logger.js';
import { getUserById, saveUser, update_user } from '../services/auth.services.js';
import { generateToken } from '../utils/user.js';
import env from '../config/env.js';
import { getLocationBySlug, save_state } from '../services/location.services.js';

export const register = async (req, res, next) => {
  try {
    const { wallet_address, role } = register_user.parse(req.body);
    console.log('wallet_address', wallet_address);

    const existing_user = await getUserById(wallet_address, 'wallet_address role');

    if (existing_user) {
      console.log('User already exists', existing_user);
      const access_token = generateToken({
        user_id: existing_user.wallet_address,
        role: existing_user.role === 'ADMIN' ? 'admin' : 'user',
      });
      res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return res.status(CREATED).json({
        message: 'User Successfully Logged in',
        data: existing_user,
      });
    }

    const user = {
      wallet_address: wallet_address,
      role: role === 'admin' ? 'ADMIN' : 'USER',
    };

    console.log('User', user);
    saveUser(user)
      .then(async (saved_user) => {
        const access_token = generateToken({
          user_id: saved_user.wallet_address,
          role: saved_user.role === 'ADMIN' ? 'admin' : 'user',
        });

        res.cookie('access_token', access_token, {
          httpOnly: true,
          secure: env.NODE_ENV === 'production',
          sameSite: 'strict',
        });
        return res.status(CREATED).json({
          message: 'User created successfully',
          data: saved_user,
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
    const { first_name, last_name, phone_number, email, state, mandal, district, constituency } =
      updateUserSchema.parse(req.body);
    console.log('req.user', req.user);
    const { user_id } = req.user;
    let image_url = null;

    if (req.file) {
      const file_buffer = req.file.buffer;
      image_url = await upload_to_cloudinary(file_buffer);
    }

    const location_payload = {
      state: state,
      district: district,
      mandal: mandal,
      constituency: constituency,
    };

    const location_slug = generateSlug(location_payload);

    const existing_location = await getLocationBySlug(location_slug, 'location_slug');

    if (!existing_location) {
      const location = {
        ...location_payload,
        location_slug: location_slug,
      };

      const data = await save_state(location);
      console.log('data', data);
    }

    const user_payload = {
      first_name: first_name,
      last_name: last_name,
      phone_number: phone_number,
      email: email,
      profile_image: image_url,
    };

    const updated_user = await update_user(user_id, user_payload);

    return res.status(CREATED).json({
      message: 'User updated successfully',
      data: updated_user,
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
