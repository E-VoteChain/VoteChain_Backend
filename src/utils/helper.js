import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { cloudinary } from '../config/cloudinary.js';
import { Readable } from 'stream';
import * as path from 'path';
import ejs from 'ejs';
import AppError from './AppError.js';
import { BAD_REQUEST } from '../constants/index.js';

export const formatError = (error) => {
  let errors = {};
  console.log('error', error);
  error.errors.map((err) => {
    errors[err.path?.[0]] = err.message;
  });
  return errors;
};

export const generateId = () => {
  return uuidv4();
};

export const renderEmailEjs = async (fileName, payload) => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const html = await ejs.renderFile(path.join(__dirname, `../views/${fileName}.ejs`), payload);
  return html;
};

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

export const generateSlug = (payload) => {
  return `${payload.state}-${payload.district}-${payload.mandal}-${payload.constituency}`;
};

export const validateUserStatus = (user) => {
  if (!user) {
    throw new AppError('User not found', BAD_REQUEST);
  }

  const statusErrors = {
    APPROVED: 'User already approved',
    REJECTED: 'User already rejected'
  };

  if (statusErrors[user.status]) {
    throw new AppError(statusErrors[user.status], BAD_REQUEST);
  }
};
