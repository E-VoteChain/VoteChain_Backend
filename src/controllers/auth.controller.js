import { formatError, unicodeToEmoji, validateAndUploadImage } from '../utils/helper.js';
import {
  registerUser,
  updateUserSchema,
  validateAadharImage,
  validateProfileImage,
  validateSearch,
  validateWalletAddress,
} from '../validations/index.js';
import { AppError } from '../utils/AppError.js';
import { BAD_REQUEST, CREATED, INTERNAL_SERVER, OK } from '../constants/index.js';
import logger from '../config/logger.js';
import {
  getUserById,
  getUserByWalletAddress,
  saveUser,
  updateUser,
} from '../services/auth.services.js';
import { generateToken } from '../utils/user.js';
import env from '../config/env.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { searchUserByWalletAddress } from '../services/user.services.js';
import {
  getConstituencyById,
  getDistrictById,
  getStateById,
} from '../services/location.services.js';
import { getPartyById } from '../services/party.services.js';

export const register = async (req, res) => {
  try {
    const validatedFields = registerUser.safeParse(req.body);

    if (!validatedFields.success) {
      throw new AppError('Invalid wallet address', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { walletAddress } = validatedFields.data;

    const existing_user = await getUserByWalletAddress(walletAddress, {
      id: true,
      walletAddress: true,
      status: true,
      role: true,
    });

    if (existing_user) {
      const access_token = generateToken({
        userId: existing_user.id,
        walletAddress: existing_user.walletAddress,
        status: existing_user.status,
        role: existing_user.role,
      });

      const profile_completed = existing_user.status !== 'INCOMPLETE';

      res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return successResponse(res, { profile_completed }, 'User logged in successfully');
    }

    const saved_user = await saveUser({ walletAddress });

    const access_token = generateToken({
      userId: saved_user.id,
      walletAddress: saved_user.walletAddress,
      role: saved_user.role === 'ADMIN' ? 'ADMIN' : 'USER',
      status: saved_user.status,
    });

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return successResponse(
      res,
      { profile_completed: false },
      'User registered successfully',
      CREATED,
      null
    );
  } catch (error) {
    logger.error('Registration error:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong ', error.message, INTERNAL_SERVER);
  }
};

export const update_profile = async (req, res) => {
  try {
    const validatedFields = updateUserSchema.safeParse(req.body);
    if (!validatedFields.success) {
      throw new AppError('Invalid input data', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { userId } = req.user;
    const user = await getUserById(userId, { id: true });
    if (!user) {
      throw new AppError('User not found', BAD_REQUEST);
    }

    const profileImageUrl = await validateAndUploadImage(
      req.files.profileImage[0],
      validateProfileImage
    );

    const aadharImageUrl = await validateAndUploadImage(
      req.files.aadharImage[0],
      validateAadharImage
    );

    const {
      firstName,
      lastName,
      phoneNumber,
      email,
      stateId,
      districtId,
      mandalId,
      constituencyId,
      dob,
      aadharNumber,
    } = validatedFields.data;

    const dobString = new Date(dob).toISOString();
    const user_payload = {
      firstName,
      lastName,
      phoneNumber,
      email,
      profileImage: profileImageUrl,
      aadharImage: aadharImageUrl,
      stateId,
      districtId,
      mandalId,
      constituencyId,
      dobString,
      aadharNumber,
    };

    const updatedUser = await updateUser(user.id, user_payload);
    return successResponse(res, updatedUser, 'User updated successfully', CREATED, null);
  } catch (error) {
    logger.error('Error updating user profile:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong ', error.message, INTERNAL_SERVER);
  }
};

export const decode_jwt = async (req, res) => {
  try {
    const { userId, walletAddress, role, status } = req.user;
    return successResponse(res, {
      userId,
      walletAddress,
      role,
      status,
    });
  } catch (error) {
    logger.error('JWT decoding error:', error);
    return errorResponse(res, 'Failed to decode JWT', error.message, INTERNAL_SERVER);
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie('access_token');
    return successResponse(res, null, 'User logged out successfully', OK, null);
  } catch (error) {
    logger.error('Logout error:', error);
    return errorResponse(res, 'Failed to logout', error.message, INTERNAL_SERVER);
  }
};

export const searchUser = async (req, res) => {
  try {
    const validatedFields = validateSearch.safeParse(req.query);

    if (!validatedFields.success) {
      throw new AppError('Invalid wallet address', BAD_REQUEST, formatError(validatedFields.error));
    }

    const { walletAddress, status, role, inParty } = validatedFields.data;
    const { walletAddress: userWallet } = req.user;

    const formattedStatus = status.split(',').map((s) => s.trim().toUpperCase());
    const formattedRole = role.split(',').map((r) => r.trim().toUpperCase());

    const users = await searchUserByWalletAddress(
      userWallet,
      walletAddress,
      formattedStatus,
      formattedRole,
      inParty === 'true'
    );

    const formattedUsers = await Promise.all(
      users.slice(0, 5).map(async (user) => {
        const userDetails = user.userDetails?.[0] || {};
        const userLocation = user.userLocation?.[0] || {};
        const stateName = userLocation.state?.name || '';
        const districtId = userLocation.districtId;
        const constituencyId = userLocation.constituencyId;

        const { name: constituencyName = '' } =
          (await getConstituencyById(constituencyId, { name: true })) || {};
        const { name: districtName = '' } =
          (await getDistrictById(districtId, { name: true })) || {};

        const userData = {
          id: user.id,
          walletAddress: user.walletAddress,
          status: user.status,
          role: user.role,
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          phoneNumber: userDetails.phoneNumber,
          email: userDetails.email,
          profileImage: userDetails.profileImage,
          aadharImage: userDetails.aadharImage,
          aadharNumber: userDetails.aadharNumber,
          dob: userDetails.dob,
          location: {
            stateName,
            districtName,
            constituencyName,
          },
        };

        if (inParty && user.partyMembers?.length > 0) {
          const party = user.partyMembers[0].party;
          userData.party = {
            id: party.id,
            name: party.name,
            symbol: unicodeToEmoji(party.symbol),
            logo: party.details?.[0]?.logo || '',
          };
        }

        return userData;
      })
    );

    return successResponse(res, formattedUsers, 'User fetched successfully', OK, null);
  } catch (error) {
    console.error('Error searching user:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong', error.message, INTERNAL_SERVER);
  }
};

export const get_user_details = async (req, res) => {
  try {
    const validatedFields = validateWalletAddress.safeParse(req.query);
    if (!validatedFields.success) {
      throw new AppError('Invalid wallet address', BAD_REQUEST, formatError(validatedFields.error));
    }
    const { userId } = req.user;
    const details = await getUserById(userId, {
      id: true,
      role: true,
      status: true,
      verifiedAt: true,
      walletAddress: true,
      userDetails: {
        select: {
          firstName: true,
          lastName: true,
          phoneNumber: true,
          email: true,
          profileImage: true,
          dob: true,
        },
      },
      partyMembers: {
        select: {
          party: {
            select: {
              id: true,
            },
          },
        },
      },
      userLocation: {
        select: {
          stateId: true,
          constituencyId: true,
        },
      },
    });

    if (!details) {
      throw new AppError('User not found', BAD_REQUEST);
    }

    console.log('user dob', details.userDetails[0]);

    const user = {
      id: details.id,
      walletAddress: details.walletAddress,
      status: details.status,
      role: details.role,
      verifiedAt: details.verifiedAt,
      firstName: details.userDetails[0].firstName,
      lastName: details.userDetails[0].lastName,
      dob: details.userDetails[0].dob,
      phoneNumber: details.userDetails[0].phoneNumber,
      email: details.userDetails[0].email,
      profileImage: details.userDetails[0].profileImage,
    };
    const locationIds = {
      stateId: details.userLocation[0].stateId,
      constituencyId: details.userLocation[0].constituencyId,
    };

    const state_name = await getStateById(locationIds.stateId, {
      name: true,
    });
    const constituency_name = await getConstituencyById(locationIds.constituencyId, {
      name: true,
    });

    const location = {
      state: state_name.name,
      constituency: constituency_name.name,
      constituencyId: locationIds.constituencyId,
      stateId: locationIds.stateId,
    };

    user.location = location;

    if (details.partyMembers.length > 0) {
      const partyId = details.partyMembers[0].party.id;
      user.partyId = partyId;

      const party = await getPartyById(partyId, {
        id: true,
        name: true,
        symbol: true,
        details: {
          select: {
            logo: true,
            description: true,
            headquarters: true,
            website: true,
            contact_email: true,
            contact_phone: true,
            founded_on: true,
            abbreviation: true,
          },
        },
        partyMembers: {
          select: {
            status: true,
            userId: true,
            role: true,
            createdAt: true,
          },
        },
      });
      const isLeader = party.partyMembers.some(
        (member) => member.userId === userId && member.role === 'PHEAD'
      );

      const userMember = party.partyMembers.find((member) => member.userId === userId);

      user.party = {
        id: party.id,
        name: party.name,
        symbol: unicodeToEmoji(party.symbol),
        logo: party.details[0].logo,
        isLeader: isLeader,
        joinDate: userMember?.createdAt,
        description: party.details[0].description,
        status: userMember?.status,
        headquarters: party.details[0].headquarters,
        website: party.details[0].website,
        contact_email: party.details[0].contact_email,
        contact_phone: party.details[0].contact_phone,
        founded_on: party.details[0].founded_on,
        abbreviation: party.details[0].abbreviation,
      };

      const pending_count = party.partyMembers.filter(
        (member) => member.status === 'PENDING'
      ).length;
      const approved_count = party.partyMembers.filter(
        (member) => member.status === 'APPROVED'
      ).length;

      const rejected_count = party.partyMembers.filter(
        (member) => member.status === 'REJECTED'
      ).length;

      if (isLeader) {
        user.party.pending_count = pending_count;
        user.party.approved_count = approved_count;
        user.party.rejected_count = rejected_count;
      }
    }

    return successResponse(res, user, 'User details fetched successfully', OK);
  } catch (error) {
    logger.error('Error fetching user details:', error);
    if (error instanceof AppError) {
      return errorResponse(res, error.message, error.errors, error.statusCode);
    }
    return errorResponse(res, 'Something went wrong', error.message, INTERNAL_SERVER);
  }
};
