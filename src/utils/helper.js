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
 * 
 @param {Error | any} error - The error object, usually from a validation library like Zod or a thrown Error.
 * @returns {Object} Formatted error object. 
 */
export const formatError = (error) => {
  if (error.name === 'ZodError' && Array.isArray(error.errors)) {
    return error.errors.map((e) => `${e.path.join('.')} - ${e.message}`);
  }

  if (error instanceof Error) {
    return [error.message];
  }

  return ['Unknown error occurred'];
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

export const emojiToUnicode = (emoji) => {
  return [...emoji].map((char) => char.codePointAt(0).toString(16).toUpperCase()).join('-');
};

export const unicodeToEmoji = (unicode) => {
  return String.fromCodePoint(...unicode.split('-').map((code) => parseInt(code, 16)));
};

export const validateAndUploadImage = async (file, schema) => {
  const validatedFields = schema.safeParse(file);
  if (!validatedFields.success) {
    throw new AppError('Invalid file type', BAD_REQUEST, formatError(validatedFields.error));
  }

  const imageUrl = await upload_to_cloudinary(file.buffer);
  return imageUrl;
};

export const formatPartyData = (party) => {
  const details = party.details?.[0] || {};

  const allMembers = party.partyMembers || [];

  const leader = allMembers.find((member) => member.role === 'PHEAD');
  const leaderEmail = leader?.user?.userDetails?.[0]?.email || null;

  const otherMembers = allMembers.filter((member) => member.role !== 'PHEAD');

  return {
    id: party.id,
    name: party.name,
    symbol: unicodeToEmoji(party.symbol),
    abbreviation: details.abbreviation,
    logo: details.logo,
    description: details.description,
    contact_email: details.contact_email,
    contact_phone: details.contact_phone,
    website: details.website,
    social_urls: {
      twitter: details.twitter_url || null,
      facebook: details.facebook_url || null,
      instagram: details.instagram_url || null,
    },
    founded_on: details.founded_on,
    headquarters: details.headquarters,
    leader_email: leaderEmail,
    leader_name:
      `${leader?.user?.userDetails?.[0]?.firstName || ''} ${leader?.user?.userDetails?.[0]?.lastName || ''}`.trim(),
    leader_wallet_address: leader?.user?.walletAddress,
    tokens: (party.tokens || []).map((token) => ({
      token: token.token,
      expiryTime: token.expiresAt,
      status: token.status,
    })),
    partyMembersCount: allMembers.length,
    partyMembers: otherMembers.map((member) => {
      const userDetails = member.user?.userDetails?.[0] || {};
      return {
        id: member.id,
        name: `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim(),
        email: userDetails.email || null,
        wallet_address: member.user?.walletAddress || null,
        role: member.role || null,
      };
    }),
  };
};
