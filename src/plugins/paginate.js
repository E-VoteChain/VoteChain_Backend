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
 * @param {string} options.sortBy - Sorting criteria (e.g., 'created_at:desc')
 * @param {string} options.populate - Populate related fields (e.g., 'profile.address')
 * @param {number} options.limit - Number of items per page
 * @param {number} options.page - Page number
 * @returns {Promise<QueryResult>}
 */
export const paginate = async (model, filter = {}, options = {}) => {
  const { sortBy, limit = 10, page = 1, populate } = options;

  let orderBy;
  if (sortBy) {
    const sortingCriteria = sortBy.split(',').map((sortOption) => {
      const [field, direction] = sortOption.split(':');
      return { [field]: direction === 'desc' ? 'desc' : 'asc' };
    });

    orderBy = sortingCriteria.length === 1 ? sortingCriteria[0] : sortingCriteria;
  } else {
    orderBy = { createdAt: 'desc' };
  }

  const skip = (page - 1) * limit;
  const take = limit;

  const query = {
    where: filter,
    skip,
    take,
    orderBy,
  };

  if (populate) {
    query.include = buildNestedInclude(populate);
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

/**
 * Helper function to build nested `include` object for Prisma.
 * @param {string} populateString - Comma-separated list of relations (e.g., 'profile.address')
 * @returns {Object} - Nested include object
 */
const buildNestedInclude = (populateString) => {
  const fields = populateString.split(',');
  const include = {};

  for (const field of fields) {
    const parts = field.trim().split('.');
    let current = include;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (!current[part]) {
        current[part] = {};
      }

      if (i === parts.length - 1) {
        current[part] = true;
      } else {
        if (!current[part].include) {
          current[part].include = {};
        }
        current = current[part].include;
      }
    }
  }

  return include;
};
