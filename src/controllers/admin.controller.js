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

    const { user_id } = validatedFields.data;

    const user = await getUserById(user_id, {
      wallet_address: true,
      role: true,
      status: true,
    });

    validateUserStatus(user);

    await save_approve_user(user_id);
    return successResponse(res, null, 'User approved successfully', OK);
  } catch (error) {
    if (error instanceof AppError) {
      logger.error(`AppError: ${error.message}`, error);
      return errorResponse(res, error.message, error.details, error.statusCode);
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

    const { user_id, reason, rejected_fields } = validatedFields.data;

    const user = await getUserById(user_id, {
      wallet_address: true,
      role: true,
      status: true,
    });

    validateUserStatus(user);

    await save_reject_user({ user_id, reason, rejected_fields });
    return successResponse(res, null, 'User rejected successfully', OK);
  } catch (error) {
    if (error instanceof AppError) {
      logger.error(`AppError: ${error.message}`, error);
      return errorResponse(res, error.message, error.details, error.statusCode);
    }
    return errorResponse(
      res,
      'Something went wrong while rejecting user',
      error.message,
      INTERNAL_SERVER
    );
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
      const userDetails = user.UserDetails[0];
      const userLocation = user.UserLocation[0];

      const formattedUser = {
        id: user.id,
        wallet_address: user.wallet_address,
        status: user.status,
        first_name: userDetails.first_name,
        last_name: userDetails.last_name,
        email: userDetails.email,
        phone_number: userDetails.phone_number,
        profile_image: userDetails.profile_image,
        aadhar_image: userDetails.aadhar_image,
      };

      const location = await getLocationByStateId({
        state_id: userLocation.state_id,
        district_id: userLocation.district_id,
        mandal_id: userLocation.mandal_id,
        constituency_id: userLocation.constituency_id,
      });

      const locationNames = location.District.map((district) => {
        return district.Mandal.map((mandal) => {
          return mandal.Constituency.map((constituency) => {
            return {
              state_name: location.name,
              district_name: district.name,
              mandal_name: mandal.name,
              constituency_name: constituency.name,
            };
          });
        }).flat();
      }).flat();
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
      return errorResponse(res, error.message, error.details, error.statusCode);
    }
    logger.error('Error while fetching pending users', error);
    return errorResponse(
      res,
      'Something went wrong while fetching pending users',
      error.message,
      INTERNAL_SERVER
    );
  }
};

export const create_election = async (req, res) => {
  try {
    const { election_name, election_start_time, election_end_time } = req.body;

    // Validate the request body
    if (!election_name || !election_start_time || !election_end_time) {
      throw new AppError('All fields are required', BAD_REQUEST);
    }

    // TODO: Add logic to create the election in the database
    // For example, you might want to call a service function to save the election details
    // await createElectionInDB({ election_name, election_start_time, election_end_time });

    return successResponse(res, null, 'Election created successfully', OK);
  } catch (error) {
    if (error instanceof AppError) {
      logger.error(`AppError: ${error.message}`, error);
      return errorResponse(res, error.message, error.details, error.statusCode);
    }
    logger.error('Error while creating election', error);
    return errorResponse(
      res,
      'Something went wrong while creating the election',
      error.message,
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

    const { party_name, link_expiry, user_id, party_symbol: logo } = validatedFields.data;

    const { role } = req.user;

    const user = await getUserById(user_id, {
      id: true,
      role: true,
      status: true,
    });

    if (role !== 'admin') {
      throw new AppError('Unauthorized', UN_AUTHORIZED);
    }

    if (user.status === 'rejected' || user.status === 'pending' || user.status === 'incomplete') {
      throw new AppError('User is not approved', BAD_REQUEST);
    }

    if (user.role === 'phead') {
      throw new AppError('User is already a party head', UN_AUTHORIZED);
    }

    const party_symbol = emojiToUnicode(logo);
    const userDetails = await getUserDetails(user_id, {
      first_name: true,
      last_name: true,
      email: true,
    });

    const id = generateId();
    const verify_token = generateToken(
      {
        id,
        party_name,
      },
      link_expiry
    );
    const url = `${env.base_url}/api/v1/party/create/?email=${userDetails.email}&token=${verify_token}`;
    const expiry_time = new Date(Date.now() + link_expiry * 24 * 60 * 60 * 1000);

    await save_party({ party_name, party_symbol, expiry_time, user_id, verify_token });

    const html = await renderEmailEjs('emails/party-creation', {
      userName: `${userDetails.first_name} ${userDetails.last_name}`,
      partyName: party_name,
      partyApplicationLink: url,
      endDate: expiry_time.toDateString(),
    });

    await sendMail(
      userDetails.email,
      `Preliminary Party "${party_name}" Created – Action Required`,
      html
    );

    return successResponse(res, null, 'Party created successfully', OK, null, req.originalUrl);
  } catch (error) {
    if (error instanceof AppError) {
      logger.error(`AppError: ${error.message}`, error);
      return errorResponse(res, error.message, error.details, error.statusCode);
    }
    logger.error('Error while creating party', error);
    return errorResponse(
      res,
      'Something went wrong while creating the party',
      error.message,
      INTERNAL_SERVER
    );
  }
};
