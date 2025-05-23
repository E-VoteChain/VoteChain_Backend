import {
  emojiToUnicode,
  formatError,
  generateId,
  renderEmailEjs,
  validateUserStatus,
} from '../utils/helper.js';
import { AppError } from '../utils/AppError.js';
import { BAD_REQUEST, INTERNAL_SERVER, OK, UN_AUTHORIZED } from '../constants/index.js';
import logger from '../config/logger.js';
import { approveUserSchema, createParty, rejectUserSchema } from '../validations/index.js';
import { getUserById, getUserDetails } from '../services/auth.services.js';
import { save_approve_user, save_reject_user } from '../services/admin.services.js';
import { queryUsers } from '../services/user.services.js';
import { getLocationByStateId } from '../services/location.services.js';
import qs from 'qs';
import { successResponse, errorResponse } from '../utils/response.js';
import { generateToken } from '../utils/user.js';
import env from '../config/env.js';
import { save_party } from '../services/party.services.js';
import { sendMail } from '../config/mail.js';

export const approve_user = async (req, res) => {
  try {
    const validatedFields = approveUserSchema.safeParse(req.body);

    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { userId } = validatedFields.data;

    const user = await getUserById(userId, {
      walletAddress: true,
      role: true,
      status: true,
    });

    validateUserStatus(user);

    await save_approve_user(userId);
    return successResponse(res, null, 'User approved successfully', OK);
  } catch (error) {
    console.log('error', error);
    if (error instanceof AppError) {
      logger.error(`AppError: ${error.message}`, error);
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    logger.error('Error while approving user', error);
    return errorResponse(
      res,
      'Something went wrong while approving user',
      error.message,
      INTERNAL_SERVER
    );
  }
};

export const reject_user = async (req, res) => {
  try {
    const validatedFields = rejectUserSchema.safeParse(req.body);

    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { userId, reason, rejectedFields } = validatedFields.data;

    const user = await getUserById(userId, {
      walletAddress: true,
      role: true,
      status: true,
    });

    validateUserStatus(user);

    await save_reject_user({ userId, reason, rejectedFields });
    return successResponse(res, null, 'User rejected successfully', OK);
  } catch (error) {
    if (error instanceof AppError) {
      logger.error(`AppError: ${error.message}`, error);
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong while rejecting user', null, INTERNAL_SERVER);
  }
};

export const getPendingUsers = async (req, res) => {
  const { page, limit, sortBy, populate, filter } = qs.parse(req.query);

  let parsedFilter = {};
  if (filter) {
    try {
      parsedFilter = filter;
    } catch (error) {
      logger.error('Error parsing filter:', error);
      return errorResponse(res, 'Invalid filter format', error.message, BAD_REQUEST);
    }
  }

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    sortBy,
    populate,
  };

  try {
    const result = await queryUsers(parsedFilter, options);

    if (!Array.isArray(result.results)) {
      throw new AppError('Invalid result format', INTERNAL_SERVER);
    }

    const usersWithLocation = [];

    for (const user of result.results) {
      const userDetails = user.userDetails[0];
      const userLocation = user.userLocation[0];

      const formattedUser = {
        id: user.id,
        wallet_address: user.walletAddress,
        status: user.status,
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        email: userDetails.email,
        phoneNumber: userDetails.phoneNumber,
        profileImage: userDetails.profileImage,
        aadharImage: userDetails.aadharImage,
        aadharNumber: userDetails.aadharNumber,
        dob: userDetails.dob,
        createdAt: user.createdAt,
        submittedAt: userDetails.submittedAt,
      };

      const location = await getLocationByStateId({
        stateId: userLocation.stateId,
        districtId: userLocation.districtId,
        mandalId: userLocation.mandalId,
        constituencyId: userLocation.constituencyId,
      });

      const locationNames = location.districts
        .map((district) => {
          return district.mandals
            .map((mandal) => {
              return mandal.constituencies.map((constituency) => {
                return {
                  state_name: location.name,
                  district_name: district.name,
                  mandal_name: mandal.name,
                  constituency_name: constituency.name,
                };
              });
            })
            .flat();
        })
        .flat();
      formattedUser.location = locationNames;
      usersWithLocation.push(formattedUser);
    }

    return successResponse(
      res,
      usersWithLocation,
      'Users with locations fetched successfully',
      OK,
      {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
      }
    );
  } catch (error) {
    if (error instanceof AppError) {
      logger.error(`AppError: ${error.message}`, error);
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    logger.error('Error while fetching pending users', error);
    return errorResponse(
      res,
      'Something went wrong while fetching pending users',
      null,
      INTERNAL_SERVER
    );
  }
};

export const create_party = async (req, res) => {
  try {
    const validatedFields = createParty.safeParse(req.body);
    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { partyName, linkExpiry, userId, partySymbol: logo } = validatedFields.data;

    const user = await getUserById(userId, {
      id: true,
      role: true,
      status: true,
      walletAddress: true,
    });

    if (user.role === 'PHEAD') {
      throw new AppError('User is already a party head', UN_AUTHORIZED);
    }

    const partySymbol = emojiToUnicode(logo);
    const userDetails = await getUserDetails(userId, {
      firstName: true,
      lastName: true,
      email: true,
    });

    const id = generateId();
    const verifyToken = generateToken(
      {
        id,
        partyName,
      },
      linkExpiry
    );
    const url = `${env.cors.origin}/party/verify/?walletAddress=${user.walletAddress}&token=${verifyToken}`;
    const expiryTime = new Date(Date.now() + linkExpiry * 24 * 60 * 60 * 1000);

    await save_party({ partyName, partySymbol, expiryTime, userId, verifyToken });

    const html = await renderEmailEjs('emails/party-creation', {
      userName: `${userDetails.firstName} ${userDetails.lastName}`,
      partyName,
      partyApplicationLink: url,
      endDate: expiryTime.toDateString(),
    });

    await sendMail(
      userDetails.email,
      `Preliminary Party "${partyName}" Created – Action Required`,
      html
    );

    return successResponse(
      res,
      {
        partyName,
        partySymbol,
        url,
        expiryTime,
      },
      'Party created successfully',
      OK,
      null,
      req.originalUrl
    );
  } catch (error) {
    console.log('error', error);
    if (error instanceof AppError) {
      logger.error(`AppError: ${error.message}`, error);
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    logger.error('Error while creating party', error);
    return errorResponse(
      res,
      'Something went wrong while creating the party',
      null,
      INTERNAL_SERVER
    );
  }
};
