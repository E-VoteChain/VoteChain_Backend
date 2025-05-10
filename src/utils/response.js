import { OK, BAD_REQUEST } from '../constants/index.js';

/**
 * Sends a successful response.
 *
 * @param {Object} res - The Express response object.
 * @param {Object|null} [data=null] - The data to be included in the response.
 * @param {string} [message='Success'] - The success message.
 * @param {number} [statusCode=200] - The HTTP status code.
 * @param {Object|null} [query=null] - The query parameters to be included in the response.
 * @returns {Object} The response object with the success data.
 */
export const successResponse = (
  res,
  data = null,
  message = 'Success',
  statusCode = OK,
  query = null
) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
    query,
    errors: null,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Sends an error response.
 *
 * @param {Object} res - The Express response object.
 * @param {string} [message='An error occurred'] - The error message.
 * @param {Object|null} [errors=null] - The errors to be included in the response.
 * @param {number} [statusCode=400] - The HTTP status code.
 * @returns {Object} The response object with the error data.
 */
export const errorResponse = (
  res,
  message = 'An error occurred',
  errors = null,
  statusCode = BAD_REQUEST
) => {
  return res.status(statusCode).json({
    status: 'error',
    message,
    data: null,
    errors: errors || message,
    timestamp: new Date().toISOString(),
  });
};
