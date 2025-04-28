import { formatError, validateUserStatus } from '../utils/helper.js';
import AppError from '../utils/AppError.js';
import { BAD_REQUEST, INTERNAL_SERVER, OK } from '../constants/index.js';
import logger from '../config/logger.js';
import { approve_user_schema } from '../validations/index.js';
import { getUserById } from '../services/auth.services.js';
import { save_approve_user, save_reject_user } from '../services/admin.services.js';
import { queryUsers } from '../services/user.services.js';
import { getLocationByStateId } from '../services/location.services.js';
import qs from 'qs';

export const get_users = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sortBy, filter } = req.query;
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: sortBy,
    };

    const result = await queryUsers(filter, options);

    return res.status(200).send({
      page: result.page,
      limit: result.limit,
      total: result.total,
      data: result,
    });
  } catch (error) {
    logger.error('Error while creating user', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};

export const approve_user = async (req, res, next) => {
  try {
    const { user_id } = approve_user_schema.parse(req.body);

    const user = await getUserById(user_id, 'wallet_address role status');

    validateUserStatus(user);

    save_approve_user({ user_id }).then(async () => {
      return res.sendStatus(OK);
    });
  } catch (error) {
    if (error instanceof Error) {
      const error = formatError(error);
      return next(new AppError(error, BAD_REQUEST));
    }

    logger.error('Error while creating user', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};

export const reject_user = async (req, res, next) => {
  try {
    const { user_id } = approve_user_schema.parse(req.body);

    const user = await getUserById(user_id, 'wallet_address role status');

    validateUserStatus(user);

    save_reject_user({ user_id }).then(async () => {
      return res.sendStatus(OK);
    });
  } catch (error) {
    if (error instanceof Error) {
      const error = formatError(error);
      return next(new AppError(error, BAD_REQUEST));
    }

    logger.error('Error while creating user', error);
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
        wallet_address: user.wallet_address,
        status: user.status.toLowerCase(),
        first_name: userDetails.first_name,
        last_name: userDetails.last_name,
        email: userDetails.email,
        phone_number: userDetails.phone_number,
        profile_image: userDetails.profile_image,
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

    res.json({
      results: usersWithLocation,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(result.totalResults / options.limit),
      totalResults: result.totalResults,
    });
  } catch (error) {
    logger.error('Error while fetching users', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};

export const create_election = async (req, res, next) => {
  try {
    const { election_name, election_start_time, election_end_time } = req.body;

    // Validate the request body
    if (!election_name || !election_start_time || !election_end_time) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Logic to create an election
    // You can replace this with your actual implementation

    return res.status(201).json({ message: 'Election created successfully' });
  } catch (error) {
    logger.error('Error while creating election', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};
