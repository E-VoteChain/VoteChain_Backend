import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import bcrypt from 'bcrypt';

export const generateToken = (userInfo, expiresIn = env.jwt.accessExpirationDays) => {
  const access_token = jwt.sign(userInfo, env.jwt.access_secret, {
    expiresIn: `${expiresIn}d`,
  });

  return access_token;
};

export const extractToken = async (token, secret) => {
  return jwt.verify(token, secret);
};

export const decodeUser = (token, secret) => {
  return jwt.decode(token, secret);
};

export const generatePassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash(password, salt);
    return newPassword;
  } catch {
    return false;
  }
};
