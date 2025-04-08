import { formatError } from '../utils/helper.js';
import { register_user, updateUserSchema } from '../validations/index.js';
import AppError from '../utils/AppError.js';
import { BAD_REQUEST, CREATED, INTERNAL_SERVER } from '../constants/index.js';
import logger from '../config/logger.js';
import { getUserById, saveUser, update_user } from '../services/auth.services.js';
import { generateToken } from '../utils/user.js';
import env from '../config/env.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';


cloudinary.config({ 
  cloud_name: env.cloudinary.cloud_name, 
  api_key: env.cloudinary.api_key,
  api_secret: env.cloudinary.api_secret,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

export const register = async (req, res, next) => {
  try {
    const { wallet_address, role } = register_user.parse(req.body);

    const existing_user = await getUserById(wallet_address);

    if (existing_user) {
      const access_token = generateToken({
        user_id: existing_user.wallet_address,
        role: existing_user.role === 'ADMIN' ? 'admin' : 'user',
      });
      res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
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
    const userData = updateUserSchema.parse(req.body);
    const { user_id } = req.user; // assuming populated from auth middleware

    let imageUrl = null;

    if (req.file) {
      // Upload the image to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      imageUrl = uploadResult.secure_url;
    }

    const updatedUserData = {
      ...userData,
      ...(imageUrl && { profile_image: imageUrl }), // add image if uploaded
    };

    const updated_user = await update_user(user_id, updatedUserData);

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
