import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { INTERNAL_SERVER } from '../constants/index.js';

export const getLocationByStateId = async (payload) => {
  try {
    return await prisma.state.findUnique({
      where: { id: payload.state_id },
      include: {
        District: {
          where: { id: payload.district_id },
          include: {
            Mandal: {
              where: { id: payload.mandal_id },
              include: {
                Constituency: {
                  where: { id: payload.constituency_id },
                },
              },
            },
          },
        },
      },
    });
  } catch (error) {
    throw new AppError('Failed to get location by state ID', INTERNAL_SERVER, error);
  }
};

export const getStates = async () => {
  try {
    return await prisma.state.findMany();
  } catch (error) {
    throw new AppError('Failed to get states', INTERNAL_SERVER, error);
  }
};

export const getDistrictByState = async (state_id) => {
  try {
    return await prisma.district.findMany({
      where: { state_id },
    });
  } catch (error) {
    throw new AppError('Failed to get districts by state', INTERNAL_SERVER, error);
  }
};

export const getMandalByDistrict = async (district_id) => {
  try {
    return await prisma.mandal.findMany({
      where: { district_id },
    });
  } catch (error) {
    throw new AppError('Failed to get mandals by district', INTERNAL_SERVER, error);
  }
};

export const getConstituencyByMandal = async (mandal_id) => {
  try {
    return await prisma.constituency.findMany({
      where: { mandal_id },
    });
  } catch (error) {
    throw new AppError('Failed to get constituencies by mandal', INTERNAL_SERVER, error);
  }
};
