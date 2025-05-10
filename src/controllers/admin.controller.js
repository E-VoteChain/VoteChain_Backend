import {
  formatError,
  generateId,
  renderEmailEjs,
  upload_to_cloudinary,
  validateUserStatus,
} from '../utils/helper.js';
import { AppError } from '../utils/AppError.js';
import { BAD_REQUEST, INTERNAL_SERVER, OK } from '../constants/index.js';
import logger from '../config/logger.js';
import {
  approveUserSchema,
  createParty,
  rejectUserSchema,
  validatePartyImage,
} from '../validations/index.js';
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

export const approve_user = async (req, res, next) => {
  try {
    const validatedFields = approveUserSchema.safeParse(req.body);

    if (!validatedFields.success) {
      console.log('validatedFields.error', validatedFields.error);
      return next(new AppError('Invalid input data', BAD_REQUEST));
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
    console.log('error', error);
    if (error instanceof Error) {
      const formattedError = formatError(error);
      return next(new AppError(formattedError, BAD_REQUEST));
    }

    logger.error('Error while approving user', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};

export const reject_user = async (req, res, next) => {
  try {
    const { user_id, reason, rejected_fields } = rejectUserSchema.parse(req.body);

    const user = await getUserById(user_id, {
      wallet_address: true,
      role: true,
      status: true,
    });

    validateUserStatus(user);

    await save_reject_user({ user_id, reason, rejected_fields });
    return successResponse(res, null, 'User rejected successfully', OK);
  } catch (error) {
    logger.error('Error while rejecting user', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};

export const getPendingUsers = async (req, res, next) => {
  const { page, limit, sortBy, populate, filter } = qs.parse(req.query);

  let parsedFilter = {};
  if (filter) {
    try {
      parsedFilter = filter;
    } catch (error) {
      logger.error('Error parsing filter:', error);
      return next(new AppError('Invalid filter format', BAD_REQUEST));
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
      logger.error('Result is not an array', result);
      return next(new AppError('Invalid result format', INTERNAL_SERVER));
    }

    const usersWithLocation = [];

    for (const user of result.results) {
      const userDetails = user.UserDetails[0];
      const userLocation = user.UserLocation[0];

      const formattedUser = {
        id: user.id,
        wallet_address: user.wallet_address,
        status: user.status.toLowerCase(),
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
    console.log('error', error);
    // logger.error('Error while fetching users', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};

export const create_election = async (req, res, next) => {
  try {
    const { election_name, election_start_time, election_end_time } = req.body;

    // Validate the request body
    if (!election_name || !election_start_time || !election_end_time) {
      return errorResponse(res, 'All fields are required', null, BAD_REQUEST);
    }

    // TODO: Add logic to create the election in the database
    // For example, you might want to call a service function to save the election details
    // await createElectionInDB({ election_name, election_start_time, election_end_time });

    return successResponse(res, null, 'Election created successfully', OK);
  } catch (error) {
    logger.error('Error while creating election', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};

export const create_party = async (req, res, next) => {
  try {
    const validatedFields = createParty.safeParse(req.body);

    if (!validatedFields.success) {
      console.log('validatedFields.error', validatedFields.error);
      return next(new AppError('Invalid input data', BAD_REQUEST));
    }

    const { party_name, link_expiry, user_id } = validatedFields.data;
    const validatedImage = validatePartyImage.safeParse({ party_image: req.file });

    if (!validatedImage.success) {
      console.log('validatedImage.error', validatedImage.error);
      return next(new AppError('Invalid image format', BAD_REQUEST));
    }

    const { party_image } = validatedImage.data;

    const user = req.user;
    const status = user.status.toLowerCase();
    const role = user.role.toLowerCase();

    if (status !== 'approved') {
      errorResponse(res, 'User is not approved', null, BAD_REQUEST);
      return;
    }

    if (role === 'phead') {
      errorResponse(res, 'User is already a party head', null, BAD_REQUEST);
      return;
    }

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

    const party_symbol = await upload_to_cloudinary(party_image.buffer);
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
    logger.error('Error while creating party', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};
