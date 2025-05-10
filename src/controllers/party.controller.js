import env from '../config/env.js';
import logger from '../config/logger.js';
import { BAD_REQUEST, INTERNAL_SERVER } from '../constants/index.js';
import { getUserByEmail } from '../services/auth.services.js';
import { getPartyByName, removeVerifyToken } from '../services/party.services.js';
import { AppError } from '../utils/AppError.js';
import { checkTimeDifference } from '../utils/helper.js';
import { extractToken } from '../utils/user.js';
import { validateEmailQuery } from '../validations/index.js';

export const verify_party_link = async (req, res, next) => {
  try {
    const validatedFields = validateEmailQuery.safeParse(req.query);
    if (!validatedFields.success) {
      const errorMessage = validatedFields.error.errors.map((err) => err.message).join(', ');
      return next(new AppError(errorMessage, BAD_REQUEST));
    }

    const { token, email } = validatedFields.data;
    const decoded = await extractToken(token, env.jwt.access_secret);
    if (!decoded || !decoded.id || !decoded.party_name) {
      console.log('I am in this');
      return next(new AppError('Invalid token payload', BAD_REQUEST));
    }

    const { party_name } = decoded;
    const { token_expiry, party_token, id } = await getPartyByName(party_name, {
      id: true,
      token_expiry: true,
      party_token: true,
    });

    if (party_token !== token) {
      return next(new AppError('Invalid token', BAD_REQUEST));
    }

    const token_gap = checkTimeDifference(token_expiry);
    if (token_gap > 0) {
      await removeVerifyToken(id);
      return next(new AppError('Token expired', BAD_REQUEST));
    }

    const user = await getUserByEmail(email, { id: true });
    if (!user) {
      return next(new AppError('User not found', BAD_REQUEST));
    }

    await removeVerifyToken(id);
    return res.redirect('http://localhost:3000');
  } catch (error) {
    console.log('error', error);
    logger.error('Error while verifying link:', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};
