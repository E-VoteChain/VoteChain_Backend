import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { BAD_REQUEST, INTERNAL_SERVER } from '../constants/index.js';
import { PrismaClientValidationError } from '@prisma/client/runtime/library';

export const getUserById = async (id, select = {}) => {
  try {
    return await prisma.user.findUnique({ where: { id }, select });
  } catch (error) {
    throw new AppError('Failed to get user by ID', INTERNAL_SERVER, error);
  }
};

export const getUserByWalletAddress = async (wallet_address, select = {}) => {
  try {
    return await prisma.user.findUnique({ where: { wallet_address }, select });
  } catch (error) {
    throw new AppError('Failed to get user by wallet address', INTERNAL_SERVER, error);
  }
};

export const getUserDetails = async (id, select = {}) => {
  try {
    return await prisma.userDetails.findUnique({ where: { user_id: id }, select });
  } catch (error) {
    throw new AppError('Failed to get user details', INTERNAL_SERVER, error);
  }
};

export const getUserLocation = async (id, select = {}) => {
  try {
    return await prisma.userLocation.findUnique({ where: { user_id: id }, select });
  } catch (error) {
    throw new AppError('Failed to get user location', INTERNAL_SERVER, error);
  }
};

export const getUserByEmail = async (email, select = {}) => {
  try {
    return await prisma.userDetails.findUnique({ where: { email }, select });
  } catch (error) {
    throw new AppError('Failed to get user by email', INTERNAL_SERVER, error);
  }
};

export const saveUser = async (payload) => {
  try {
    return await prisma.user.create({ data: payload });
  } catch (error) {
    // Handle Prisma client validation errors more explicitly
    if (error instanceof PrismaClientValidationError) {
      if (error.code === 'P2002') {
        throw new AppError('User already exists', BAD_REQUEST, error); // More specific message
      }
    }
    // For other errors, return a generic failure message
    throw new AppError('Failed to save user', INTERNAL_SERVER, error);
  }
};

export const updateUser = async (id, payload) => {
  const {
    first_name,
    last_name,
    phone_number,
    email,
    profile_image,
    state_id,
    district_id,
    mandal_id,
    constituency_id,
    aadhar_image,
  } = payload;
  try {
    return await prisma.user.update({
      where: { id },
      data: {
        status: 'PENDING',
        UserDetails: {
          create: {
            first_name,
            last_name,
            phone_number,
            email,
            profile_image,
            aadhar_image,
          },
        },
        UserLocation: {
          create: {
            state_id: state_id,
            district_id: district_id,
            mandal_id: mandal_id,
            constituency_id: constituency_id,
          },
        },
      },
    });
  } catch (error) {
    console.log('Error', error);
    if (error instanceof PrismaClientValidationError) {
      if (error.code === 'P2002') {
        throw new AppError('User with this information already exists', BAD_REQUEST, error);
      }
    }
    throw new AppError('Failed to update user', INTERNAL_SERVER, error);
  }
};

export const updateUserLocation = async (_id, payload) => {
  const { state_id, district_id, mandal_id, constituency_id } = payload;
  try {
    return await prisma.user.update({
      where: { id: _id },
      data: {
        UserLocation: {
          create: {
            state_id,
            district_id,
            mandal_id,
            constituency_id,
          },
        },
      },
    });
  } catch (error) {
    console.log('error', error);
    throw new AppError('Failed to update user location', INTERNAL_SERVER, error);
  }
};
