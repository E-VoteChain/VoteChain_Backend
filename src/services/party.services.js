import prisma from '../config/db.js';
import { INTERNAL_SERVER } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';

export const save_party = async (payload) => {
  const { party_name, party_symbol, expiry_time, user_id, verify_token } = payload;
  try {
    const party = await prisma.party.create({
      data: {
        name: party_name,
        logo: party_symbol,
        token_expiry: new Date(expiry_time),
        party_token: verify_token,
        leader: {
          connect: {
            id: user_id,
          },
        },
      },
    });
    return party;
  } catch (error) {
    console.log('Error saving party:', error);
    throw new AppError('Failed to save party', INTERNAL_SERVER);
  }
};

export const getPartyByName = async (party_name, select) => {
  try {
    const party = await prisma.party.findUnique({
      where: {
        name: party_name,
      },
      select: select,
    });
    return party;
  } catch (error) {
    console.log('Error fetching party by name:', error);
    throw new AppError('Failed to fetch party', INTERNAL_SERVER);
  }
};

export const removeVerifyToken = async (id) => {
  try {
    const party = await prisma.party.update({
      where: {
        id: id,
      },
      data: {
        party_token: null,
        token_expiry: null,
      },
    });
    return party;
  } catch (error) {
    console.log('Error removing verify token:', error);
    throw new AppError('Failed to remove verify token', INTERNAL_SERVER);
  }
};
