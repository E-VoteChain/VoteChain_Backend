import env from '../config/env.js';
import logger from '../config/logger.js';
import qs from 'qs';
import { BAD_REQUEST, CREATED, INTERNAL_SERVER, OK } from '../constants/index.js';
import { getUserByWalletAddress, getUserDetails } from '../services/auth.services.js';
import {
  addMember,
  approveUser,
  createPartyDetails,
  getPartyById,
  getPartyByName,
  getPartyByToken,
  getPartyMembers,
  getTokenByPartyId,
  joinPartyAsMember,
  queryParties,
  queryPartyMembers,
  rejectUser,
  removeVerifyToken,
  verifyAndIssueUpdateToken,
} from '../services/party.services.js';
import { AppError } from '../utils/AppError.js';
import {
  checkTimeDifference,
  formatError,
  formatPartyData,
  renderEmailEjs,
  unicodeToEmoji,
  validateAndUploadImage,
} from '../utils/helper.js';
import { errorResponse, successResponse } from '../utils/response.js';
import { extractToken, generateToken } from '../utils/user.js';
import {
  updateParty,
  validateEmailQuery,
  validatePartyId,
  validatePartyIdAndWalletAddress,
  validatePartyImage,
  validateUserId,
  validateWalletAddress,
} from '../validations/index.js';
import { sendMail } from '../config/mail.js';
import { getConstituencyById, getStateById } from '../services/location.services.js';

export const verify_party_link = async (req, res) => {
  try {
    const validatedFields = validateEmailQuery.safeParse(req.query);
    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { walletAddress: user_address } = req.user;

    const { token, walletAddress } = validatedFields.data;

    if (user_address !== walletAddress) {
      throw new AppError('Invalid wallet address', BAD_REQUEST);
    }

    const decoded = await extractToken(token, env.jwt.access_secret);
    if (!decoded || !decoded.id || !decoded.partyName) {
      throw new AppError('Invalid token payload', BAD_REQUEST);
    }

    const { partyName } = decoded;

    const { id } = await getPartyByName(partyName, {
      id: true,
    });

    const {
      token: party_token,
      expiresAt,
      status,
    } = await getTokenByPartyId(id, {
      token: true,
      expiresAt: true,
      sentAt: true,
      id: true,
      status: true,
    });

    if (status === 'USED') {
      throw new AppError('Party link already used', BAD_REQUEST);
    }

    if (status === 'EXPIRED') {
      throw new AppError('Party link expired', BAD_REQUEST);
    }

    if (party_token !== token) {
      throw new AppError('Invalid token', BAD_REQUEST);
    }

    const token_gap = checkTimeDifference(expiresAt);
    if (token_gap > 0) {
      await removeVerifyToken(id);
      throw new AppError('Token expired', BAD_REQUEST);
    }

    const update_party_token = generateToken({ id, partyName }, 0.25);

    await verifyAndIssueUpdateToken({
      id: id,
      new_token: update_party_token,
      old_token: party_token,
      token_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return successResponse(
      res,
      {
        token_url: `/party/update?token=${update_party_token}`,
      },
      'Party link verified successfully',
      OK,
      req.query
    );
  } catch (error) {
    console.log('error', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }

    if (error.message && error.message.toLowerCase().includes('jwt')) {
      return errorResponse(res, 'Invalid token', null, BAD_REQUEST);
    }

    return errorResponse(
      res,
      'Something went wrong while verifying the party link',
      null,
      INTERNAL_SERVER
    );
  }
};

export const update_party = async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = await extractToken(token, env.jwt.access_secret);
    if (!decoded || !decoded.id || !decoded.partyName) {
      throw new AppError('Invalid token payload', BAD_REQUEST);
    }

    const { userId } = req.user;
    console.log('req.user', req.user);

    const tokenDetails = await getPartyByToken(token, {
      id: true,
      token: true,
      expiresAt: true,
      status: true,
      party: {
        select: {
          id: true,
          name: true,
          partyMembers: {
            where: {
              role: 'PHEAD',
            },
            select: {
              userId: true,
            },
          },
        },
      },
    });

    const party = tokenDetails.party;
    const partyMembers = party.partyMembers[0];
    console.log('party', party);
    console.log('UserId', userId);
    console.log('party.userId', partyMembers);

    if (partyMembers.userId !== userId) {
      throw new AppError('You are not authorized to update this party', BAD_REQUEST);
    }

    if (!tokenDetails) {
      throw new AppError('Party not found', BAD_REQUEST);
    }

    if (tokenDetails.status === 'USED') {
      throw new AppError('Party link already used', BAD_REQUEST);
    }

    if (tokenDetails.status === 'EXPIRED') {
      throw new AppError('Party link expired', BAD_REQUEST);
    }

    if (!party || tokenDetails.token !== token) {
      throw new AppError('Invalid token', BAD_REQUEST);
    }

    if (checkTimeDifference(tokenDetails.expiresAt) > 0) {
      throw new AppError('Token expired', BAD_REQUEST);
    }

    const validatedFields = updateParty.safeParse(req.body);

    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const {
      description,
      contactEmail,
      contactPhone,
      website,
      abbreviation,
      instagram_url,
      facebook_url,
      twitter_url,
      foundedOn,
      headquarters,
    } = validatedFields.data;
    const uploaded_url = await validateAndUploadImage(req.file, validatePartyImage);
    const founded_on = new Date(foundedOn).toISOString();

    const partyData = {
      logo: uploaded_url,
      description,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      website,
      abbreviation,
      instagram_url,
      facebook_url,
      twitter_url,
      founded_on,
      headquarters,
      token,
    };
    const result = await createPartyDetails(party.id, userId, partyData);

    return successResponse(res, result, 'Party updated successfully', OK);
  } catch (error) {
    console.log('error', error);
    if (error instanceof AppError) {
      logger.error(`AppError: ${error.message}`, error);
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }

    logger.error('Error while updating party:', error);
    return errorResponse(
      res,
      'Something went wrong while updating the party',
      null,
      INTERNAL_SERVER
    );
  }
};

export const add_members = async (req, res) => {
  try {
    console.log('req.body', req.party);
    const { id: party_id, name } = req.party;
    const validatedFields = validateWalletAddress.safeParse(req.body);

    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { walletAddress } = validatedFields.data;

    const user = await getUserByWalletAddress(walletAddress, {
      id: true,
    });
    const userDetails = await getUserDetails(user.id, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    });
    if (!user) {
      throw new AppError('User not found', BAD_REQUEST);
    }

    const partyUser = await getPartyMembers(user.id, party_id, {
      id: true,
      partyId: true,
      userId: true,
      role: true,
      status: true,
    });

    if (partyUser) {
      if (partyUser.status === 'PENDING') {
        throw new AppError('User invitation is pending', BAD_REQUEST);
      }

      if (partyUser.status === 'APPROVED') {
        throw new AppError('User is already a member of the party', BAD_REQUEST);
      }

      if (partyUser.status === 'REJECTED') {
        throw new AppError('User invitation is rejected', BAD_REQUEST);
      }
    }
    const result = await addMember(party_id, user.id);

    const html = await renderEmailEjs('emails/party-invite', {
      userName: `${userDetails.firstName} ${userDetails.lastName}`,
      partyName: name,
    });

    await sendMail(userDetails.email, `You have been invited to join ${name}`, html);

    return successResponse(res, result, 'Member added successfully', CREATED, {
      party_id,
      user_id: userDetails.id,
    });
  } catch (error) {
    if (error instanceof AppError) {
      logger.error(`AppError: ${error.message}`, error);
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }

    logger.error('Error while adding members:', error);
    return errorResponse(res, 'Something went wrong while adding members', null, INTERNAL_SERVER);
  }
};

export const join_party = async (req, res) => {
  try {
    const { userId } = req.user;
    const validatedFields = validatePartyId.safeParse(req.body);
    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { partyId } = validatedFields.data;
    const party = await getPartyById(partyId, {
      id: true,
      name: true,
      partyMembers: {
        select: {
          userId: true,
          status: true,
        },
      },
    });

    const members = party.partyMembers;
    const isMember = members.find((member) => member.userId === userId);

    if (isMember) {
      if (isMember.status === 'PENDING') {
        throw new AppError('User invitation is pending', BAD_REQUEST);
      }

      if (isMember.status === 'APPROVED') {
        throw new AppError('User is already a member of the party', BAD_REQUEST);
      }

      if (isMember.status === 'REJECTED') {
        throw new AppError('User invitation is rejected', BAD_REQUEST);
      }
    }

    const result = await joinPartyAsMember(party.id, userId);
    console.log('result', result);

    return successResponse(res, result, 'Party joined successfully', CREATED, {
      party_id: party.id,
      user_id: userId,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(
      res,
      'Something went wrong while joining the party',
      null,
      INTERNAL_SERVER
    );
  }
};

export const approve_user = async (req, res) => {
  try {
    const { id: partyId } = req.party;
    console.log('req.party', req.party);
    const validatedFields = validateUserId.safeParse(req.body);
    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { userId } = validatedFields.data;
    console.log('userId', userId);
    const party = await getPartyMembers(userId, partyId, {
      id: true,
      status: true,
      userId: true,
      role: true,
    });
    if (!party) {
      throw new AppError('Party member not found', BAD_REQUEST);
    }

    if (party.status === 'APPROVED') {
      throw new AppError('User is already a member of the party', BAD_REQUEST);
    }

    if (party.status === 'REJECTED') {
      throw new AppError('User invitation is rejected', BAD_REQUEST);
    }

    console.log(typeof userId, userId); // must be 'string'
    console.log(typeof partyId, partyId); // must be 'string'

    const result = await approveUser(party.id);
    console.log('result', result);

    return successResponse(res, result, 'User approved successfully', OK);
  } catch (error) {
    console.log('error', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(
      res,
      'Something went wrong while approving the user',
      null,
      INTERNAL_SERVER
    );
  }
};

export const reject_user = async (req, res) => {
  try {
    const { id: partyId } = req.party;
    const validatedFields = validateUserId.safeParse(req.body);
    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { userId } = validatedFields.data;
    const party = await getPartyMembers(userId, partyId, {
      id: true,
      status: true,
      userId: true,
      role: true,
    });
    console.log('party', party);
    if (!party) {
      throw new AppError('Party member not found', BAD_REQUEST);
    }

    if (party.status === 'REJECTED') {
      throw new AppError('User invitation is rejected', BAD_REQUEST);
    }

    if (party.status === 'APPROVED') {
      throw new AppError('User is already a member of the party', BAD_REQUEST);
    }

    const result = await rejectUser(party.id);

    return successResponse(res, result, 'User rejected successfully', OK);
  } catch (error) {
    console.log('error', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(
      res,
      'Something went wrong while rejecting the user',
      null,
      INTERNAL_SERVER
    );
  }
};

export const get_party_by_token = async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = await extractToken(token, env.jwt.access_secret);
    if (!decoded || !decoded.id || !decoded.partyName) {
      throw new AppError('Invalid token payload', BAD_REQUEST);
    }
    const { partyName } = decoded;
    const party = await getPartyByName(partyName, {
      id: true,
      name: true,
      symbol: true,
      partyMembers: {
        select: {
          user: {
            select: {
              role: true,
              userDetails: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      tokens: {
        where: {
          status: 'ACTIVE',
        },
        select: {
          token: true,
          expiresAt: true,
          status: true,
        },
      },
    });

    const tokenDetails = party.tokens[0];

    const leader = party.partyMembers[0].user.userDetails[0];
    if (tokenDetails) {
      if (tokenDetails.status === 'USED') {
        throw new AppError('Party link already used', BAD_REQUEST);
      }

      if (tokenDetails.status === 'EXPIRED') {
        throw new AppError('Party link expired', BAD_REQUEST);
      }
    } else {
      throw new AppError('Party token Expired', BAD_REQUEST);
    }

    if (!party) {
      throw new AppError('Party not found', BAD_REQUEST);
    }

    return successResponse(
      res,
      {
        id: party.id,
        name: party.name,
        symbol: unicodeToEmoji(party.symbol),
        leader_name: `${leader.firstName} ${leader?.lastName}`.trim(),
        leader_email: leader.email,
      },
      'Party fetched successfully',
      OK,
      req.query
    );
  } catch (error) {
    console.log(error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(
      res,
      'Something went wrong while fetching party by token',
      null,
      INTERNAL_SERVER
    );
  }
};

export const get_all_parties = async (req, res) => {
  const { page, limit, sortBy, populate } = req.query;

  let parsedFilter = {};

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    sortBy,
    populate,
  };
  try {
    const parties = await queryParties(parsedFilter, options);

    if (!parties || parties.length === 0) {
      return successResponse(res, [], 'No parties found');
    }

    const formattedParties = parties.results.map(formatPartyData);

    return successResponse(
      res,
      {
        results: formattedParties,
      },
      'Parties fetched successfully',
      OK,
      req.query
    );
  } catch (error) {
    console.log('error', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong while fetching parties', null, INTERNAL_SERVER);
  }
};

export const get_party_by_wallet_id = async (req, res) => {
  try {
    const validatedFields = validatePartyIdAndWalletAddress.safeParse(req.query);
    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }
    const { partyId, walletAddress } = validatedFields.data;

    const party = await getPartyById(partyId, {
      id: true,
      name: true,
      symbol: true,
      details: {
        select: {
          logo: true,
          description: true,
          contact_email: true,
          contact_phone: true,
          website: true,
          abbreviation: true,
          headquarters: true,
          founded_on: true,
          facebook_url: true,
          twitter_url: true,
          instagram_url: true,
        },
      },
      partyMembers: {
        select: {
          role: true,
          status: true,
          user: {
            select: {
              id: true,
              walletAddress: true,
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
      },
    });
    const partyMembers = party.partyMembers.slice(0, 5);
    const details = party.details[0];
    const partyHead = partyMembers.find((member) => member.role === 'PHEAD');
    const isPartyMember = partyMembers.find(
      (member) => member.user.walletAddress === walletAddress
    );

    const memberStatus = isPartyMember && isPartyMember.status;
    const formattedPartyDetails = {
      id: party.id,
      name: party.name,
      symbol: party.symbol,
      logo: details.logo,
      description: details.description,
      contact_email: details.contact_email,
      contact_phone: details.contact_phone,
      website: details.website,
      abbreviation: details.abbreviation,
      headquarters: details.headquarters,
      founded_on: details.founded_on,
      facebook_url: details.facebook_url,
      twitter_url: details.twitter_url,
      instagram_url: details.instagram_url,
      leader_name: `${partyHead.user.userDetails[0].firstName} ${partyHead.user.userDetails[0].lastName}`,
      leader_wallet_address: partyHead.user.walletAddress,
      leader_email: partyHead.user.userDetails[0].email,
      leader_image: partyHead.user.userDetails[0].profileImage,
      memberStatus: memberStatus ? memberStatus : 'NOT_MEMBER',
      members: partyMembers.map((member) => ({
        id: member.user.id,
        walletAddress: member.user.walletAddress,
        role: member.role,
        status: member.status,
        name: `${member.user.userDetails[0].firstName} ${member.user.userDetails[0].lastName}`,
        image: member.user.userDetails[0].profileImage,
      })),
    };

    console.log('formattedPartyDetails', formattedPartyDetails);
    return successResponse(res, formattedPartyDetails, 'Party fetched successfully', OK);
  } catch (error) {
    console.log('error', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong while fetching parties', null, INTERNAL_SERVER);
  }
};

export const get_party_members = async (req, res) => {
  try {
    const { page, limit, sortBy, filter } = qs.parse(req.query);
    let parsedFilter = {};
    if (filter) {
      try {
        parsedFilter = filter;
      } catch (error) {
        logger.error('Error parsing filter:', error);
        return errorResponse(res, 'Invalid filter format', error.message, BAD_REQUEST);
      }
    }

    const { id } = req.party;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      sortBy,
    };

    const { data } = await queryPartyMembers(id, parsedFilter.status.toUpperCase(), options);
    const formattedData = await Promise.all(
      data.map(async (party) => {
        const user = party.user;
        const userDetails = user.userDetails[0];
        const userLocation = user.userLocation[0];

        const state_name = await getStateById(userLocation.stateId, {
          name: true,
        });
        const constituency_name = await getConstituencyById(userLocation.constituencyId, {
          name: true,
        });

        return {
          id: party.id,
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          role: party.role,
          status: party.status,
          email: userDetails.email,
          walletAddress: user.walletAddress,
          state_name: state_name.name,
          constituency_name: constituency_name.name,
          profileImage: userDetails.profileImage,
          createdAt: party.createdAt,
          userId: user.id,
        };
      })
    );

    return successResponse(res, formattedData, 'Fetched successfully', OK, req.query);
  } catch (error) {
    console.log('error', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong while fetching parties', null, INTERNAL_SERVER);
  }
};
