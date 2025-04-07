import prisma from '../config/db.js';

export const getUserById = async (id, fields = '') => {
  return await prisma.user.findUnique({
    where: { wallet_address: id },
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
  try {
    const user = await prisma.user.update({
      where: { id: id },
      data: payload,
    });
    return user;
  } catch (err) {
    return err;
  }
};
