import { formatError, validateUserStatus } from '../utils/helper.js';
import AppError from '../utils/AppError.js';
import { BAD_REQUEST, INTERNAL_SERVER, OK } from '../constants/index.js';
import logger from '../config/logger.js';
import { approve_user_schema } from '../validations/index.js';
import { getUserById } from '../services/auth.services.js';
import { save_approve_user, save_reject_user } from '../services/admin.services.js';
import { queryUsers } from '../services/user.services.js';

export const get_users =async(req,res,next)=>{
  try {
    const { page = 1, limit = 10, sortBy, filter } = req.query;
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: sortBy,
    };

    const result=await queryUsers(filter,options);

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
}

export const approve_user = async (req, res, next) => {
  try {
    const { wallet_address } = approve_user_schema.parse(req.body);

    const user = await getUserById(wallet_address, 'wallet_address role status');

    validateUserStatus(user)
  
    save_approve_user({ wallet_address }).then(async () => {
      return res.sendStatus(OK);
    });
  } catch (error) {
    console.log('error', error);
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
    const { wallet_address } = approve_user_schema.parse(req.body);

    const user = await getUserById(wallet_address, 'wallet_address role status');

    validateUserStatus(user)


    save_reject_user({ wallet_address }).then(async () => {
      return res.sendStatus(OK);
    });
  } catch (error) {
    console.log('error', error);
    if (error instanceof Error) {
      const error = formatError(error);
      return next(new AppError(error, BAD_REQUEST));
    }

    logger.error('Error while creating user', error);
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
}