import { PrismaClientValidationError } from '@prisma/client/runtime/library';
import prisma from '../config/db.js';
import { BAD_REQUEST, INTERNAL_SERVER } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';

export const save_approve_user = async (user_id) => {
  try {
    return await prisma.user.update({
      where: { id: user_id },
      data: { status: 'APPROVED' },
    });
  } catch (error) {
    if (error instanceof PrismaClientValidationError) {
      throw new AppError('Prisma Validation Error', BAD_REQUEST, error);
    }
    throw new AppError('Failed to approve user', INTERNAL_SERVER, error);
  }
};

export const save_reject_user = async ({ user_id, reason }) => {
  try {
    const data = await prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        status: 'REJECTED',
        UserDetails: {
          update: {
            where: {
              user_id: user_id,
            },
            data: {
              rejected_reason: reason,
            },
          },
        },
      },
    });

    return data;
  } catch (error) {
    if (error instanceof PrismaClientValidationError) {
      throw new AppError('Prisma Validation Error', BAD_REQUEST, error);
    }
    throw new AppError('Failed to reject user', INTERNAL_SERVER, error);
  }
};
