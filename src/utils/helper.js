import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { cloudinary } from '../config/cloudinary.js';
import { Readable } from 'stream';
import * as path from 'path';
import ejs from 'ejs';
import { AppError } from './AppError.js';
import { BAD_REQUEST, INTERNAL_SERVER } from '../constants/index.js';
import logger from '../config/logger.js';

/**
 * Formats errors, especially validation errors (like Zod).
 * @param {Error} error
 * @returns {Object} Formatted error object.
 */
export const formatError = (error) => {
  if (error.name === 'ZodError' && Array.isArray(error.errors)) {
    const formatted = {};
    error.errors.forEach((e) => {
      const path = e.path.length > 0 ? e.path.join('.') : 'root'; // If the path is empty, label it as 'root'
      formatted[path] = e.message;
    });
    return formatted;
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Unknown error occurred' };
};

/**
 * Generates a UUID v4 string.
 * @returns {string}
 */
export const generateId = () => uuidv4();

/**
 * Renders an EJS email template with the given payload.
 * @param {string} fileName
 * @param {Object} payload
 * @returns {Promise<string>} Rendered HTML string.
 */
export const renderEmailEjs = async (fileName, payload) => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const html = await ejs.renderFile(path.join(__dirname, `../views/${fileName}.ejs`), payload);
  return html;
};

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer
 * @returns {Promise<string>} URL of uploaded file.
 */
export const upload_to_cloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'votechain' }, (error, result) => {
      if (error) return reject(error);
      resolve(result.secure_url);
    });

    const readable = new Readable();
    readable.push(fileBuffer);
    readable.push(null);
    readable.pipe(stream);
  });
};

/**
 * Validates user status. Throws AppError if user is missing or has terminal status.
 * @param {Object|null} user
 */
export const validateUserStatus = (user) => {
  if (!user) {
    throw new AppError('User not found', BAD_REQUEST);
  }

  const statusErrors = {
    APPROVED: 'User already approved',
    REJECTED: 'User already rejected',
  };

  if (statusErrors[user.status]) {
    throw new AppError(statusErrors[user.status], BAD_REQUEST);
  }
};

/**
 * Centralized error handling middleware.
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || INTERNAL_SERVER;
  const message = err.message || 'Something went wrong';

  const logDetails = {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    stack: err.stack,
    errors: err.errors || null,
  };

  if (err.isOperational) {
    logger.error(`${req.method} ${req.originalUrl} - ${message}`, logDetails);
  } else {
    logger.error('Critical Error:', logDetails);
  }

  if (err instanceof AppError) {
    return res.status(statusCode).json({
      message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  if (err.name === 'ZodError' && Array.isArray(err.errors)) {
    return res.status(BAD_REQUEST).json({
      message: 'Validation failed',
      errors: formatError(err),
    });
  }

  return res.status(INTERNAL_SERVER).json({
    message: 'Something went wrong',
  });
};

export const checkTimeDifference = (date) => {
  const now = new Date();
  const tokenDate = new Date(date);
  const differenceInMilliseconds = now - tokenDate;
  const differenceInMinutes = Math.floor(differenceInMilliseconds / 1000 / 60);
  return differenceInMinutes;
};
