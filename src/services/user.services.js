import { paginate } from '../plugins/paginate.js';

export const queryUsers = async (filter, options) => {
  const users = await paginate('user', filter, options);
  return users;
};