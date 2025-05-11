import prisma from '../config/db.js';
import { INTERNAL_SERVER, NOT_FOUND } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';

export const verifyAndIssueUpdateToken = async ({ id, new_token, token_expiry }) => {
  return await prisma.$transaction(async (tx) => {
    const party = await tx.party.findUnique({
      where: { id },
      select: { id: true, party_token: true, token_expiry: true },
    });

    if (!party) throw new AppError('Party not found', NOT_FOUND);

    await tx.party.update({
      where: { id: party.id },
      data: {
        party_token: new_token,
        token_expiry,
      },
    });

    return { party_id: party.id };
  });
};

export const createPartyDetails = async (id, user_id, payload) => {
  const { logo, description, contact_email, contact_phone, website, abbreviation } = payload;
  return await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user_id },
      data: {
        role: 'phead',
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
        party: {
          connect: {
            id: id,
          },
        },
      },
    });
  });
};

export const save_party = async (payload) => {
  const { party_name, party_symbol, expiry_time, user_id, verify_token } = payload;
  try {
    const party = await prisma.party.create({
      data: {
        name: party_name,
        symbol: party_symbol,
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
  } catch {
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
  } catch {
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
  } catch {
    throw new AppError('Failed to remove verify token', INTERNAL_SERVER);
  }
};
