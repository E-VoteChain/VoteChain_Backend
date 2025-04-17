import prisma from '../config/db.js';

export const save_approve_user = async (user_id) => {
  try {
    const data = await prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        status: 'APPROVED',
      },
    });

    return data;
  } catch (error) {
    console.log('error', error);
    return error;
  }
};

export const save_reject_user = async (user_id) => {
  try {
    const data = await prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        status: 'REJECTED',
      },
    });

    return data;
  } catch (error) {
    console.log('error', error);
    return error;
  }
};
