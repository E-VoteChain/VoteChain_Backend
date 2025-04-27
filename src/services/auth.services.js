import prisma from '../config/db.js';

export const getUserById = async (id, fields = '') => {
  return await prisma.user.findUnique({
    where: { id: id },
    select: fields
      ? fields.split(' ').reduce((acc, field) => ({ ...acc, [field]: true }), {})
      : undefined,
  });
};

export const getUserByWalletAddress = async (wallet_address, fields = '') => {
  return await prisma.user.findUnique({
    where: { wallet_address: wallet_address },
    select: fields
      ? fields.split(' ').reduce((acc, field) => ({ ...acc, [field]: true }), {})
      : undefined,
  });
};

export const getUserDetails = async (id, fields = '') => {
  return await prisma.userDetails.findUnique({
    where: { user_id: id },
    select: fields
      ? fields.split(' ').reduce((acc, field) => ({ ...acc, [field]: true }), {})
      : undefined,
  });
};

export const getUserByEmail = async (email, fields = '') => {
  const user = await prisma.user.findUnique({
    where: { email: email },
    select: fields
      ? fields.split(' ').reduce((acc, field) => ({ ...acc, [field]: true }), {})
      : undefined,
  });
  return user;
};

export const saveUser = async (payload) => {
  console.log('Payload', payload);
  try {
    const user = await prisma.user.create({
      data: payload,
    });
    return user;
  } catch (err) {
    return err;
  }
};

export const update_user = async (id, payload) => {
  const { first_name, last_name, phone_number, email, profile_image } = payload;
  try {
    const user = await prisma.user.update({
      where: { id: id },
      data: {
        UserDetails: {
          create: {
            first_name: first_name,
            last_name: last_name,
            phone_number: phone_number,
            email: email,
            profile_image: profile_image,
          },
        },
      },
    });
    return user;
  } catch (err) {
    console.log('error', err);
    return err;
  }
};

export const update_user_location = async (_id, payload) => {
  const { state_id, district_id, mandal_id, constituency_id } = payload;

  try {
    const user = await prisma.user.update({
      where: {
        id: _id,
      },
      data: {
        UserLocation: {
          create: {
            state_id: state_id,
            district_id: district_id,
            mandal_id: mandal_id,
            constituency_id: constituency_id,
          },
        },
      },
    });
    return user;
  } catch (error) {
    return error;
  }
};
