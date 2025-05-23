import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { INTERNAL_SERVER } from '../constants/index.js';

export const getLocationByStateId = async (payload) => {
  try {
    return await prisma.state.findUnique({
      where: { id: payload.stateId },
      include: {
        districts: {
          where: { id: payload.districtId },
          include: {
            mandals: {
              where: { id: payload.mandalId },
              include: {
                constituencies: {
                  where: { id: payload.constituencyId },
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

export const getDistrictByState = async (stateId) => {
  try {
    return await prisma.district.findMany({
      where: { stateId },
    });
  } catch (error) {
    throw new AppError('Failed to get districts by state', INTERNAL_SERVER, error);
  }
};

export const getMandalByDistrict = async (districtId) => {
  try {
    return await prisma.mandal.findMany({
      where: { districtId },
    });
  } catch (error) {
    throw new AppError('Failed to get mandals by district', INTERNAL_SERVER, error);
  }
};

export const getConstituencyByMandal = async (mandalId) => {
  try {
    return await prisma.constituency.findMany({
      where: { mandalId },
    });
  } catch (error) {
    throw new AppError('Failed to get constituencies by mandal', INTERNAL_SERVER, error);
  }
};

export const getStateById = async (stateId, select) => {
  try {
    return await prisma.state.findUnique({
      where: { id: stateId },
      select: select,
    });
  } catch (error) {
    throw new AppError('Failed to get state by ID', INTERNAL_SERVER, error);
  }
};

export const getDistrictById = async (districtId, select) => {
  try {
    return await prisma.district.findUnique({
      where: { id: districtId },
      select: select,
    });
  } catch (error) {
    throw new AppError('Failed to get district by ID', INTERNAL_SERVER, error);
  }
};

export const getMandalById = async (mandalId, select) => {
  try {
    return await prisma.mandal.findUnique({
      where: { id: mandalId },
      select: select,
    });
  } catch (error) {
    throw new AppError('Failed to get mandal by ID', INTERNAL_SERVER, error);
  }
};

export const getConstituencyById = async (constituencyId, select) => {
  try {
    return await prisma.constituency.findUnique({
      where: { id: constituencyId },
      select: select,
    });
  } catch (error) {
    throw new AppError('Failed to get constituency by ID', INTERNAL_SERVER, error);
  }
};
