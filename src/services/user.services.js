import { INTERNAL_SERVER } from '../constants/index.js';
import { paginate } from '../plugins/paginate.js';
import { AppError } from '../utils/AppError.js';

export const queryUsers = async (filter, options) => {
  try {
    return await paginate('user', filter, options);
  } catch (error) {
    throw new AppError('Failed to query users', INTERNAL_SERVER, error);
  }
};
