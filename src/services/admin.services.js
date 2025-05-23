import { PrismaClientValidationError } from '@prisma/client/runtime/library';
import prisma from '../config/db.js';
import { BAD_REQUEST, INTERNAL_SERVER } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';

export const save_approve_user = async (userId) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          status: 'APPROVED',
          verifiedAt: new Date(),
          userDetails: {
            update: {
              where: {
                userId: userId,
              },
              data: {
                approvedAt: new Date(),
              },
            },
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof PrismaClientValidationError) {
      throw new AppError('Prisma Validation Error', BAD_REQUEST, error);
    }
    throw new AppError('Failed to approve user', INTERNAL_SERVER, error);
  }
};

export const save_reject_user = async ({ userId, reason, rejectedFields }) => {
  try {
    const data = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        status: 'REJECTED',
        userDetails: {
          update: {
            where: {
              userId: userId,
            },
            data: {
              rejectedReason: reason,
              rejectedFields: rejectedFields,
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
