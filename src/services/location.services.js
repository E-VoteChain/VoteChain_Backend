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
