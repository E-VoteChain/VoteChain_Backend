import { formatError, validateUserStatus } from '../utils/helper.js';
import { AppError } from '../utils/AppError.js';
import { BAD_REQUEST, INTERNAL_SERVER, OK } from '../constants/index.js';
import logger from '../config/logger.js';
import { approveUserSchema, rejectUserSchema } from '../validations/index.js';
import { getUserById } from '../services/auth.services.js';
import { save_approve_user, save_reject_user } from '../services/admin.services.js';
import { queryUsers } from '../services/user.services.js';
import { getLocationByStateId } from '../services/location.services.js';
import qs from 'qs';
import { successResponse, errorResponse } from '../utils/response.js';

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
