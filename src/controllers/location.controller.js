import { AppError } from '../utils/AppError.js';
import { INTERNAL_SERVER, OK, NOT_FOUND } from '../constants/index.js';
import logger from '../config/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import {
  getConstituencyByMandal,
  getDistrictByState,
  getMandalByDistrict,
  getStates,
} from '../services/location.services.js';

export const getState = async (req, res, next) => {
  try {
    const states = await getStates();
    return successResponse(res, states, 'Success', OK);
  } catch (error) {
    logger.error('Error while fetching states', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};

export const getDistrict = async (req, res, next) => {
  try {
    const { state_id } = req.params;
    const districts = await getDistrictByState(state_id);
    return successResponse(res, districts, 'Success', OK);
  } catch (error) {
    logger.error('Error while fetching districts', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};

export const getMandal = async (req, res, next) => {
  try {
    const { district_id } = req.params;
    const mandals = await getMandalByDistrict(district_id);
    return successResponse(res, mandals, 'Success', OK);
  } catch (error) {
    logger.error('Error while fetching mandals', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};

export const getConstituency = async (req, res, next) => {
  try {
    const { mandal_id } = req.params;
    const location = await getConstituencyByMandal(mandal_id);
    if (!location) {
      return errorResponse(res, 'Location not found', null, NOT_FOUND);
    }
    return successResponse(res, location, 'Success', OK);
  } catch (error) {
    logger.error('Error while fetching location by mandal', error);
    return next(new AppError('Something went wrong', INTERNAL_SERVER));
  }
};
