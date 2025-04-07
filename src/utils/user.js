import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const generateToken = (userInfo) => {
  const access_token = jwt.sign(userInfo, env.jwt.access_secret, {
    expiresIn: `${env.jwt.accessExpirationMinutes}m`,
  });

  return access_token;
};

export const extractUser = async (token, secret) => {
  return jwt.verify(token, secret);
};

export const decodeUser = (token, secret) => {
  return jwt.decode(token, secret);
};
