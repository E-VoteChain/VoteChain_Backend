import { paginate } from '../plugins/paginate.js';

export const queryUsers = async (filter, options) => {
  try {
    const users = await paginate('user', filter, options);
    return users;
  } catch (error) {
    console.error(error);
    throw new Error('Error while querying users');
  }
};
