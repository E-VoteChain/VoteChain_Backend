import prisma from '../config/db.js';
import { INTERNAL_SERVER } from '../constants/index.js';
import { paginate } from '../plugins/paginate.js';
import { AppError } from '../utils/AppError.js';

export const queryUsers = async (filter, options) => {
  try {
    return await paginate('user', filter, options);
  } catch (error) {
    throw new AppError('Failed to query users', INTERNAL_SERVER, error);
  }
};

export const searchUserByWalletAddress = async (
  userWallet,
  walletAddress,
  status = ['approved'],
  role = [],
  inParty = false
) => {
  try {
    const baseSelect = {
      id: true,
      walletAddress: true,
      status: true,
      role: true,
      userDetails: {
        select: {
          firstName: true,
          lastName: true,
          profileImage: true,
          aadharImage: true,
          aadharNumber: true,
          dob: true,
          phoneNumber: true,
          email: true,
        },
      },
      userLocation: {
        select: {
          districtId: true,
          constituencyId: true,
          mandalId: true,
          state: {
            select: {
              name: true,
            },
          },
        },
      },
    };

    if (inParty) {
      baseSelect.partyMembers = {
        select: {
          party: {
            select: {
              id: true,
              name: true,
              symbol: true,
              details: {
                select: {
                  logo: true,
                },
              },
            },
          },
        },
      };
    }

    return await prisma.user.findMany({
      where: {
        walletAddress: {
          contains: walletAddress,
          mode: 'insensitive',
          not: userWallet,
        },
        status: {
          in: status.length ? status : ['APPROVED'],
        },
        role: {
          in: role.length ? role : ['USER'],
        },
        partyMembers: inParty
          ? {
              some: {
                status: 'APPROVED',
              },
            }
          : {
              none: {
                status: 'APPROVED',
              },
            },
      },
      select: baseSelect,
    });
  } catch (error) {
    throw new AppError('Failed to fetch users', INTERNAL_SERVER, error);
  }
};
