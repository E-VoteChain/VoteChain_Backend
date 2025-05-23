import prisma from '../config/db.js';
import { INTERNAL_SERVER, NOT_FOUND } from '../constants/index.js';
import { paginate } from '../plugins/paginate.js';
import { AppError } from '../utils/AppError.js';

export const queryPartyMembers = async (partyId, filter, options) => {
  try {
    const { page = 1, limit = 10, sortBy } = options;
    const skip = (page - 1) * limit;

    const [members, totalCount] = await Promise.all([
      prisma.partyMember.findMany({
        where: {
          partyId: partyId,
          ...(filter && { status: filter }),
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          role: true,
          user: {
            select: {
              id: true,
              walletAddress: true,
              userLocation: true,
              userDetails: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  profileImage: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: sortBy ? { createdAt: sortBy === 'desc' ? 'desc' : 'asc' } : { createdAt: 'desc' },
      }),

      prisma.partyMember.count({
        where: {
          partyId: partyId,
          ...(filter && { status: filter }),
        },
      }),
    ]);

    return {
      data: members,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  } catch (error) {
    throw new AppError('Failed to query party members', INTERNAL_SERVER, error);
  }
};

export const getPartyByUserId = async (id, select = {}) => {
  try {
    const party = await prisma.partyMember.findUnique({
      where: {
        userId: id,
        role: 'PHEAD',
      },
      select: select,
    });
    if (!party) {
      throw new AppError('Party not found with the given user ID', NOT_FOUND);
    }
    return party;
  } catch (error) {
    console.log('error', error);
    throw new AppError('Failed to fetch party, please try again later', INTERNAL_SERVER, error);
  }
};

export const getPartyById = async (id, select = {}) => {
  try {
    const party = await prisma.party.findUnique({
      where: {
        id: id,
      },
      select: select,
    });

    return party;
  } catch (error) {
    throw new AppError('Failed to fetch party, please try again later', INTERNAL_SERVER, error);
  }
};

export const verifyAndIssueUpdateToken = async ({ id, new_token, old_token, token_expiry }) => {
  return await prisma.$transaction(async (tx) => {
    await tx.party.update({
      where: {
        id: id,
      },
      data: {
        tokens: {
          create: {
            token: new_token,
            expiresAt: token_expiry,
            sentAt: new Date(),
          },
        },
      },
    });

    await tx.partyToken.update({
      where: {
        token: old_token,
      },
      data: {
        status: 'USED',
        usedAt: new Date(),
      },
    });
  });
};

export const createPartyDetails = async (id, user_id, payload) => {
  const {
    logo,
    description,
    contact_email,
    contact_phone,
    website,
    abbreviation,
    founded_on,
    headquarters,
    facebook_url,
    twitter_url,
    instagram_url,
    token,
  } = payload;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user_id },
      data: {
        role: 'PHEAD',
      },
    });

    await tx.partyDetails.create({
      data: {
        logo: logo,
        description: description,
        contact_email: contact_email,
        contact_phone: contact_phone,
        website: website,
        abbreviation: abbreviation,
        headquarters: headquarters,
        founded_on: founded_on,
        facebook_url: facebook_url || null,
        twitter_url: twitter_url || null,
        instagram_url: instagram_url || null,
        party: {
          connect: {
            id: id,
          },
        },
      },
    });

    await tx.partyToken.update({
      where: {
        token: token,
      },
      data: {
        status: 'USED',
        usedAt: new Date(),
      },
    });
  });

  return await prisma.party.findUnique({
    where: {
      id: id,
    },
    select: {
      id: true,
    },
  });
};

export const save_party = async (payload) => {
  const { partyName, partySymbol, expiryTime, userId, verifyToken } = payload;
  try {
    const party = await prisma.party.create({
      data: {
        name: partyName,
        symbol: partySymbol,
        tokens: {
          create: {
            token: verifyToken,
            expiresAt: expiryTime,
            sentAt: new Date(),
          },
        },
        partyMembers: {
          create: {
            user: {
              connect: {
                id: userId,
              },
            },
            role: 'PHEAD',
            status: 'APPROVED',
          },
        },
      },
    });
    return party;
  } catch (error) {
    throw new AppError('Failed to save party, please try again later', INTERNAL_SERVER, error);
  }
};

export const getPartyByToken = async (token, select = {}) => {
  try {
    const party = await prisma.partyToken.findUnique({
      where: {
        token: token,
      },
      select: select,
    });
    if (!party) {
      throw new AppError('Party not found with the given token', NOT_FOUND);
    }
    return party;
  } catch (error) {
    throw new AppError('Failed to fetch party, please try again later', INTERNAL_SERVER, error);
  }
};

export const getPartyByName = async (partyName, select) => {
  try {
    const party = await prisma.party.findUnique({
      where: {
        name: partyName,
      },
      select: select,
    });
    if (!party) {
      throw new AppError('Party not found with the given name', NOT_FOUND);
    }
    return party;
  } catch (error) {
    throw new AppError('Failed to fetch party, please try again later', INTERNAL_SERVER, error);
  }
};

export const getTokenByPartyId = async (partyId, select = {}) => {
  try {
    const token = await prisma.partyToken.findFirst({
      where: {
        partyId: partyId,
      },
      select: select,
    });
    return token;
  } catch (error) {
    throw new AppError('Failed to fetch token, please try again later', INTERNAL_SERVER, error);
  }
};

export const removeVerifyToken = async (id) => {
  try {
    const party = await prisma.partyToken.update({
      where: {
        id: id,
      },
      data: {
        status: 'USED',
        usedAt: new Date(),
      },
    });
    return party;
  } catch (error) {
    throw new AppError(
      'Failed to remove verification token, please try again later',
      INTERNAL_SERVER,
      error
    );
  }
};

export const getPartyMembers = async (user_id, party_id, select = {}) => {
  try {
    const member = await prisma.partyMember.findUnique({
      where: {
        userId_partyId: {
          userId: user_id,
          partyId: party_id,
        },
      },
      select: select,
    });
    return member;
  } catch (error) {
    console.log('error', error);
    throw new AppError(
      'Failed to fetch party members, please try again later',
      INTERNAL_SERVER,
      error
    );
  }
};

export const addMember = async (party_id, user_id) => {
  try {
    await prisma.partyMember.create({
      data: {
        status: 'APPROVED',
        user: {
          connect: {
            id: user_id,
          },
        },
        party: {
          connect: {
            id: party_id,
          },
        },
      },
    });
  } catch (error) {
    console.log('error', error);
    throw new AppError(
      'Failed to add member to party, please try again later',
      INTERNAL_SERVER,
      error
    );
  }
};

export const joinPartyAsMember = async (party_id, user_id) => {
  try {
    const result = await prisma.partyMember.create({
      data: {
        status: 'PENDING',
        role: 'USER',
        user: {
          connect: {
            id: user_id,
          },
        },
        party: {
          connect: {
            id: party_id,
          },
        },
      },
    });
    return result;
  } catch (error) {
    throw new AppError(
      'Failed to add member to party, please try again later',
      INTERNAL_SERVER,
      error
    );
  }
};

export const queryParties = async (filter, options) => {
  try {
    return await paginate('party', filter, options);
  } catch (error) {
    console.log('error', error);
    throw new AppError('Failed to query parties', INTERNAL_SERVER, error);
  }
};

export const approveUser = async (partyId) => {
  try {
    return await prisma.partyMember.update({
      where: {
        id: partyId,
      },
      data: {
        status: 'APPROVED',
      },
    });
  } catch (error) {
    throw new AppError('Failed to approve user', INTERNAL_SERVER, error);
  }
};

export const rejectUser = async (partyId) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.partyMember.delete({
        where: {
          id: partyId,
        },
      });
    });
  } catch (error) {
    throw new AppError('Failed to reject user', INTERNAL_SERVER, error);
  }
};
