import { formatError, validateAndUploadImage } from '../utils/helper.js';
import {
  registerUser,
  updateUserSchema,
  validateAadharImage,
  validateProfileImage,
} from '../validations/index.js';
import { AppError } from '../utils/AppError.js';
import { BAD_REQUEST, CREATED, INTERNAL_SERVER, OK } from '../constants/index.js';
import logger from '../config/logger.js';
import {
  getUserById,
  getUserByWalletAddress,
  getUserDetails,
  getUserLocation,
  saveUser,
  updateUser,
} from '../services/auth.services.js';
import { generateToken } from '../utils/user.js';
import env from '../config/env.js';
import { getLocationByStateId } from '../services/location.services.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const register = async (req, res) => {
  try {
    const validatedFields = registerUser.safeParse(req.body);

    if (!validatedFields.success) {
      console.log('Validation error:', validatedFields.error);
      throw new AppError('Invalid wallet address', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { wallet_address } = validatedFields.data;

    const existing_user = await getUserByWalletAddress(wallet_address, {
      id: true,
      wallet_address: true,
      status: true,
      role: true,
    });

    if (existing_user) {
      const access_token = generateToken({
        user_id: existing_user.id,
        wallet_address: existing_user.wallet_address,
        status: existing_user.status,
        role: existing_user.role,
      });

      const profile_completed = existing_user.status !== 'incomplete';

      res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return successResponse(res, { profile_completed }, 'User logged in successfully');
    }

    const saved_user = await saveUser({ wallet_address });

    const access_token = generateToken({
      user_id: saved_user.id,
      wallet_address: saved_user.wallet_address,
      role: saved_user.role === 'admin' ? 'admin' : 'user',
      status: saved_user.status,
    });

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return successResponse(
      res,
      { profile_completed: false },
      'User registered successfully',
      CREATED,
      null
    );
  } catch (error) {
    logger.error('Registration error:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong ', error.message, INTERNAL_SERVER);
  }
};

export const update_profile = async (req, res) => {
  try {
    const validatedFields = updateUserSchema.safeParse(req.body);
    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { user_id } = req.user;
    const user = await getUserById(user_id, { id: true });
    if (!user) {
      throw new AppError('User not found', BAD_REQUEST);
    }

    const profile_image_url = await validateAndUploadImage(
      req.files.profile_image[0],
      validateProfileImage
    );

    const aadhar_image_url = await validateAndUploadImage(
      req.files.aadhar_image[0],
      validateAadharImage
    );

    const {
      first_name,
      last_name,
      phone_number,
      email,
      state_id,
      district_id,
      mandal_id,
      constituency_id,
    } = validatedFields.data;

    const user_payload = {
      first_name,
      last_name,
      phone_number,
      email,
      profile_image: profile_image_url,
      aadhar_image: aadhar_image_url,
      state_id,
      district_id,
      mandal_id,
      constituency_id,
    };

    const updatedUser = await updateUser(user.id, user_payload);
    return successResponse(res, updatedUser, 'User updated successfully', CREATED, null);
  } catch (error) {
    logger.error('Error updating user profile:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong ', error.message, INTERNAL_SERVER);
  }
};

export const decode_jwt = async (req, res) => {
  try {
    const { user_id, wallet_address, role, status } = req.user;
    return successResponse(res, {
      user_id,
      wallet_address,
      role: role,
      status,
    });
  } catch (error) {
    logger.error('JWT decoding error:', error);
    return errorResponse(res, 'Failed to decode JWT', error.message, INTERNAL_SERVER);
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie('access_token');
    return successResponse(res, null, 'User logged out successfully', OK, null);
  } catch (error) {
    logger.error('Logout error:', error);
    return errorResponse(res, 'Failed to logout', error.message, INTERNAL_SERVER);
  }
};

export const get_user = async (req, res) => {
  try {
    const { user_id } = req.user;
    const user = await getUserById(user_id, {
      id: true,
      status: true,
      is_verified: true,
    });
    const userDetails = await getUserDetails(
      user_id,
      'first_name last_name phone_number email profile_image'
    );
    const userLocation = await getUserLocation(user_id, {
      state_id: true,
      district_id: true,
      mandal_id: true,
      constituency_id: true,
    });

    const locationHierarchy = await getLocationByStateId({
      state_id: userLocation.state_id,
      district_id: userLocation.district_id,
      mandal_id: userLocation.mandal_id,
      constituency_id: userLocation.constituency_id,
    });

    const location = {
      state: {
        id: locationHierarchy.id,
        name: locationHierarchy.name,
      },
      district: {
        id: locationHierarchy.District[0].id,
        name: locationHierarchy.District[0].name,
      },
      mandal: {
        id: locationHierarchy.District[0].Mandal[0].id,
        name: locationHierarchy.District[0].Mandal[0].name,
      },
      constituency: {
        id: locationHierarchy.District[0].Mandal[0].Constituency[0].id,
        name: locationHierarchy.District[0].Mandal[0].Constituency[0].name,
      },
    };

    return successResponse(
      res,
      {
        ...user,
        ...userDetails,
        ...userLocation,
        location,
      },
      'User fetched successfully'
    );
  } catch (error) {
    logger.error('Error fetching user details:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong', error.message, INTERNAL_SERVER);
  }
};
