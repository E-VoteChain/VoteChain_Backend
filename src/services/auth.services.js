import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { BAD_REQUEST, INTERNAL_SERVER, NOT_FOUND } from '../constants/index.js';
import { PrismaClientValidationError } from '@prisma/client/runtime/library';

export const getUserById = async (userId, select = {}) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: select,
    });
    return user;
  } catch (error) {
    throw new AppError('User not Found', NOT_FOUND, error);
  }
};
const today = new Date();
const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

export const getVoterCount = async (constituencyId) => {
  try {
    return await prisma.user.count({
      where: {
        status: 'APPROVED',
        userLocation: {
          some: {
            constituencyId: constituencyId,
          },
        },
        userDetails: {
          some: {
            approvedAt: { not: null },
            dob: { lte: eighteenYearsAgo },
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching voter count:', error);
    throw new AppError('Failed to fetch voter count', INTERNAL_SERVER, error);
  }
};

export const getVoterCountByElectionId = async (electionId) => {
  try {
    return await prisma.vote.count({
      where: {
        electionId: electionId,
      },
    });
  } catch (error) {
    console.error('Error fetching voter count by election ID:', error);
    throw new AppError('Failed to fetch voter count by election ID', INTERNAL_SERVER, error);
  }
};

export const getUserByIds = async (ids, select = {}) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: select,
    });
    return users;
  } catch (error) {
    throw new AppError('Failed to get users by IDs', INTERNAL_SERVER, error);
  }
};

export const getUserByWalletAddress = async (walletAddress, select = {}) => {
  try {
    const user = await prisma.user.findUnique({ where: { walletAddress }, select });
    return user;
  } catch (error) {
    throw new AppError('Failed to get user by wallet address', INTERNAL_SERVER, error);
  }
};

export const getUserDetails = async (id, select = {}) => {
  try {
    const userDetails = await prisma.userDetails.findUnique({ where: { userId: id }, select });

    return userDetails;
  } catch (error) {
    throw new AppError('Failed to get user details', INTERNAL_SERVER, error);
  }
};

export const getUserLocation = async (id, select = {}) => {
  try {
    const userLocation = await prisma.userLocation.findUnique({
      where: { userId: id },
      select,
    });
    if (!userLocation) {
      throw new AppError('User location not found', BAD_REQUEST);
    }
    return userLocation;
  } catch (error) {
    throw new AppError('Failed to get user location', INTERNAL_SERVER, error);
  }
};

export const getUserByEmail = async (email, select = {}) => {
  try {
    const userDetails = await prisma.userDetails.findUnique({ where: { email }, select });
    if (!userDetails) {
      throw new AppError('User not found by email', BAD_REQUEST);
    }
    return userDetails;
  } catch (error) {
    throw new AppError('Failed to get user by email', INTERNAL_SERVER, error);
  }
};

export const saveUser = async (payload) => {
  try {
    return await prisma.user.create({ data: payload });
  } catch (error) {
    if (error instanceof PrismaClientValidationError) {
      if (error.code === 'P2002') {
        throw new AppError('User already exists', BAD_REQUEST, error);
      }
    }
    throw new AppError('Failed to save user', INTERNAL_SERVER, error);
  }
};

export const updateUser = async (id, payload) => {
  const {
    firstName,
    lastName,
    phoneNumber,
    email,
    profileImage,
    stateId,
    districtId,
    mandalId,
    constituencyId,
    aadharImage,
    dobString,
    aadharNumber,
  } = payload;
  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: 'PENDING',
        userDetails: {
          create: {
            firstName,
            lastName,
            phoneNumber,
            email,
            profileImage,
            aadharImage,
            dob: dobString,
            aadharNumber,
          },
        },
        userLocation: {
          create: {
            stateId,
            districtId,
            mandalId,
            constituencyId,
          },
        },
      },
    });

    return updatedUser;
  } catch (error) {
    if (error instanceof PrismaClientValidationError) {
      if (error.code === 'P2002') {
        throw new AppError('User with this information already exists', BAD_REQUEST, error);
      }
    }
    throw new AppError('Failed to update user', INTERNAL_SERVER, error);
  }
};

export const updateUserLocation = async (_id, payload) => {
  const { stateId, districtId, mandalId, constituencyId } = payload;
  try {
    const updatedLocation = await prisma.user.update({
      where: { id: _id },
      data: {
        userLocation: {
          create: {
            stateId,
            districtId,
            mandalId,
            constituencyId,
          },
        },
      },
    });

    return updatedLocation;
  } catch (error) {
    throw new AppError('Failed to update user location', INTERNAL_SERVER, error);
  }
};

export const saveTransaction = async (payload) => {
  try {
    const { userId, transactionHash, blockNumber, status, amount, type, from, to } = payload;

    return await prisma.ethereumTransaction.create({
      data: {
        userId,
        transactionHash,
        blockNumber,
        status,
        amount,
        type,
        from,
        to,
      },
    });
  } catch (error) {
    if (error instanceof PrismaClientValidationError) {
      if (error.code === 'P2002') {
        throw new AppError('Transaction already exists', BAD_REQUEST, error);
      }
    }
    throw new AppError('Failed to save transaction', INTERNAL_SERVER, error);
  }
};
