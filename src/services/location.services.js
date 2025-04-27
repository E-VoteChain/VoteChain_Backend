import prisma from '../config/db.js';

export const getLocationBySlug = async (slug) => {
  return await prisma.constituency.findUnique({
    where: {
      slug: slug,
    },
  });
};

export const getLocationByStateId = async (payload) => {
  return await prisma.state.findUnique({
    where: {
      id: payload.state_id,
    },
    include: {
      District: {
        where: {
          id: payload.district_id,
        },
        include: {
          Mandal: {
            where: {
              id: payload.mandal_id,
            },
            include: {
              Constituency: {
                where: {
                  id: payload.constituency_id,
                },
              },
            },
          },
        },
      },
    },
  });
};

export const getStates = async () => {
  return await prisma.state.findMany();
};

export const getDistrictByState = async (state_id) => {
  return await prisma.district.findMany({
    where: {
      state_id: state_id,
    },
  });
};

export const getMandalByDistrict = async (district_id) => {
  return await prisma.mandal.findMany({
    where: {
      district_id: district_id,
    },
  });
};

export const getConstituencyByMandal = async (mandal_id) => {
  return await prisma.constituency.findMany({
    where: {
      mandal_id: mandal_id,
    },
  });
};
