import env from '../config/env.js';
import logger from '../config/logger.js';
import { BAD_REQUEST, INTERNAL_SERVER } from '../constants/index.js';
import {
  createPartyDetails,
  getPartyByName,
  removeVerifyToken,
  verifyAndIssueUpdateToken,
} from '../services/party.services.js';
import { AppError } from '../utils/AppError.js';
import { checkTimeDifference, formatError, validateAndUploadImage } from '../utils/helper.js';
import { errorResponse, successResponse } from '../utils/response.js';
import { extractToken, generateToken } from '../utils/user.js';
import { updateParty, validateEmailQuery, validatePartyImage } from '../validations/index.js';

export const verify_party_link = async (req, res) => {
  try {
    const validatedFields = validateEmailQuery.safeParse(req.query);
    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { token } = validatedFields.data;

    const decoded = await extractToken(token, env.jwt.access_secret);
    if (!decoded || !decoded.id || !decoded.party_name) {
      throw new AppError('Invalid token payload', BAD_REQUEST);
    }

    const { party_name } = decoded;

    const party = await getPartyByName(party_name, {
      id: true,
    });

    const { token_expiry, party_token, id } = await getPartyByName(party_name, {
      id: true,
      token_expiry: true,
      party_token: true,
    });

    if (party_token !== token) {
      throw new AppError('Invalid token', BAD_REQUEST);
    }

    const token_gap = checkTimeDifference(token_expiry);
    if (token_gap > 0) {
      await removeVerifyToken(id);
      throw new AppError('Token expired', BAD_REQUEST);
    }

    const update_party_token = generateToken({ id, party_name }, 0.25);

    await verifyAndIssueUpdateToken({
      id: party.id,
      new_token: update_party_token,
      token_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return res.redirect(`http://localhost:3000/party/update?token=${update_party_token}`);
  } catch (error) {
    if (error instanceof AppError) {
      logger.error(`AppError: ${error.message}`, error);
      return errorResponse(res, error.message, error.details, error.statusCode);
    }

    if (error.message && error.message.toLowerCase().includes('jwt')) {
      logger.error('JWT error:', error);
      return errorResponse(res, 'Invalid token', null, BAD_REQUEST);
    }

    logger.error('Error while verifying link:', error);
    return errorResponse(
      res,
      'Something went wrong while verifying the party link',
      null,
      INTERNAL_SERVER
    );
  }
};

export const update_party = async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = await extractToken(token, env.jwt.access_secret);
    if (!decoded || !decoded.id || !decoded.party_name) {
      throw new AppError('Invalid token payload', BAD_REQUEST);
    }

    const { party_name } = decoded;
    const { user_id } = req.user;

    const party = await getPartyByName(party_name, {
      id: true,
      leader_id: true,
      party_token: true,
      token_expiry: true,
    });

    if (party.leader_id !== user_id) {
      throw new AppError('You are not authorized to update this party', BAD_REQUEST);
    }

    if (!party || party.party_token !== token) {
      throw new AppError('Invalid or expired token', BAD_REQUEST);
    }

    if (checkTimeDifference(party.token_expiry) > 0) {
      throw new AppError('Token expired', BAD_REQUEST);
    }

    const validatedFields = updateParty.safeParse(req.body);

    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { description, contact_email, contact_phone, website, abbreviation } =
      validatedFields.data;
    const uploaded_url = await validateAndUploadImage(req.file, validatePartyImage);

    const partyData = {
      logo: uploaded_url,
      description,
      contact_email,
      contact_phone,
      website,
      abbreviation,
    };

    await createPartyDetails(party.id, user_id, partyData);

    return successResponse(res, null, 'Party updated successfully');
  } catch (error) {
    if (error instanceof AppError) {
      logger.error(`AppError: ${error.message}`, error);
      return errorResponse(res, error.message, error.details, error.statusCode);
    }

    logger.error('Error while updating party:', error);
    return errorResponse(
      res,
      'Something went wrong while updating the party',
      null,
      INTERNAL_SERVER
    );
  }
};
