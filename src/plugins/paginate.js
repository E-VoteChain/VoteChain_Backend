import prisma from '../config/db.js';

/**
 * @typedef {Object} QueryResult
 * @property {Object[]} results - Results found
 * @property {number} page - Current page
 * @property {number} limit - Maximum number of results per page
 * @property {number} totalPages - Total number of pages
 * @property {number} totalResults - Total number of documents
 */

/**
 * Pagination function for Prisma
 * @param {string} model - The name of the Prisma model (e.g., 'user')
 * @param {Object} filter - Query filter
 * @param {Object} options - Query options
 * @param {string} options.sortBy - Sorting criteria (e.g., 'createdAt:desc')
 * @param {string} options.populate - Populate related fields (e.g., 'profile.address')
 * @param {number} options.limit - Number of items per page
 * @param {number} options.page - Page number
 * @returns {Promise<QueryResult>}
 */
export const paginate = async (model, filter = {}, options = {}) => {
  const { sortBy, limit = 10, page = 1, populate } = options;

  let orderBy = {};
  if (sortBy) {
    const sortingCriteria = sortBy.split(',').map((sortOption) => {
      const [field, direction] = sortOption.split(':');
      return { [field]: direction === 'desc' ? 'desc' : 'asc' };
    });
    orderBy = sortingCriteria;
  } else {
    orderBy = { createdAt: 'desc' };
  }

  const skip = (page - 1) * limit;
  const take = limit;

  const query = {
    where: filter,
    skip: skip,
    take: take,
    orderBy: orderBy,
  };

  if (populate) {
    query.include = populate.split(',').reduce((acc, field) => {
      const fieldParts = field.split('.');
      const lastPart = fieldParts.pop();
      const path = fieldParts.join('.');

      acc[lastPart] = { include: path ? { [path]: true } : {} };
      return acc;
    }, {});
  }

  const [totalResults, results] = await Promise.all([
    prisma[model].count({ where: filter }),
    prisma[model].findMany(query),
  ]);

  const totalPages = Math.ceil(totalResults / limit);

  return {
    results,
    page,
    limit,
    totalPages,
    totalResults,
  };
};
