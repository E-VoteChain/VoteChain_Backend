/**
 * Custom error class for handling application-specific errors.
 * Extends the built-in Error class and adds additional context for better error handling.
 *
 * @class
 * @extends Error
 *
 * @param {string} message - A descriptive error message.
 * @param {number} [statusCode=500] - The HTTP status code associated with the error.
 * @param {object|null} [errors=null] - Additional error details, if any.
 *
 * @property {number} statusCode - The HTTP status code.
 * @property {object|null} errors - Additional error details.
 * @property {boolean} isOperational - Indicates whether the error is expected (operational).
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(typeof message === 'string' ? message : message?.message || 'An error occurred');
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
