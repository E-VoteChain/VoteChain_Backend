import prisma from '../config/db.js';

export const getLocationBySlug = async (slug) => {
  return await prisma.constituency.findUnique({
    where: {
      slug: slug,
    },
  });
};

export const save_state = async (payload) => {
  const {
    state: state_name,
    district: district_name,
    mandal: mandal_name,
    constituency: constituency_name,
    location_slug,
  } = payload;

  try {
    const data = await prisma.state.create({
      data: {
        name: state_name,
        districts: {
          create: {
            name: district_name,
            mandals: {
              create: {
                name: mandal_name,
                constituencies: {
                  create: {
                    name: constituency_name,
                    slug: location_slug,
                  },
                },
              },
            },
          },
        },
      },
    });
    return data;
  } catch (error) {
    return error;
  }
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



