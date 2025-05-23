import * as z from 'zod';
import { ObjectId } from 'mongodb';

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_FIELD_TYPES = [
  'firstName',
  'lastName',
  'phoneNumber',
  'email',
  'profileImage',
  'aadharImage',
  'updateLocation',
  'aadharNumber',
];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const zodObjectId = z
  .string({
    required_error: 'ObjectId is required',
    invalid_type_error: 'ObjectId must be a string',
  })
  .refine((val) => ObjectId.isValid(val), {
    message: 'Invalid ObjectId',
  });

const requiredString = (fieldName) =>
  z.string({
    required_error: `${fieldName} is required`,
    invalid_type_error: `${fieldName} must be a string`,
  });

const imageFileSchema = z
  .any({
    required_error: 'File is required',
    invalid_type_error: 'File must be a valid object',
  })
  .refine((file) => !!file && !!file.mimetype && !!file.size, {
    message: 'File is missing or invalid',
  })
  .refine((file) => ALLOWED_FILE_TYPES.includes(file.mimetype), {
    message: 'Invalid image format. Only JPEG, JPG, and PNG are allowed.',
  })
  .refine((file) => file.size <= MAX_SIZE, {
    message: 'Image size must be 5MB or less.',
  });

export const registerUser = z.object({
  walletAddress: requiredString('Wallet address').refine((data) => data.length >= 10, {
    message: 'Invalid wallet address, must be at least 10 characters',
  }),
});

export const updateUserSchema = z.object({
  firstName: requiredString('First name').min(2, {
    message: 'First name must be at least 2 characters long',
  }),
  lastName: requiredString('Last name').min(2, {
    message: 'Last name must be at least 2 characters long',
  }),
  phoneNumber: requiredString('Phone number').regex(/^\d{10,15}$/, {
    message: 'Phone number must be between 10 and 15 digits and contain only digits',
  }),
  email: requiredString('Email')
    .email({ message: 'Invalid email format' })
    .max(50, { message: 'Email must be less than or equal to 50 characters' }),
  stateId: zodObjectId,
  districtId: zodObjectId,
  mandalId: zodObjectId,
  constituencyId: zodObjectId,
  dob: requiredString('Date of birth')
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'DOB must be in YYYY-MM-DD format',
    })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'DOB must be a valid date',
    }),
  aadharNumber: requiredString('Aadhar number').regex(/^\d{12}$/, {
    message: 'Aadhar number must be exactly 12 digits',
  }),
});

export const approveUserSchema = z.object({
  userId: zodObjectId,
});

export const rejectUserSchema = z
  .object({
    userId: zodObjectId,
    reason: requiredString('Reason').min(10, {
      message: 'Reason must be at least 10 characters long',
    }),
    rejectedFields: z
      .array(requiredString('Rejected field'))
      .min(1, { message: 'At least one field must be specified for rejection' })
      .max(5, { message: 'You can reject up to 5 fields at a time' }),
  })
  .refine(
    (data) => {
      const invalidFields = data.rejectedFields.filter(
        (field) => !ALLOWED_FIELD_TYPES.includes(field)
      );
      return invalidFields.length === 0;
    },
    {
      message: `Invalid field(s) specified for rejection. Allowed fields: ${ALLOWED_FIELD_TYPES.join(
        ', '
      )}`,
      path: ['rejectedFields'],
    }
  );

export const createElectionSchema = z.object({
  electionName: requiredString('Election name'),
  electionStartTime: requiredString('Election start time').refine(
    (val) => !isNaN(Date.parse(val)),
    {
      message: 'Invalid date format for election start time',
    }
  ),
  electionEndTime: requiredString('Election end time').refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format for election end time',
  }),
});

export const validateUserId = z.object({
  userId: zodObjectId,
});

export const validateWalletAddress = z.object({
  walletAddress: requiredString('Wallet address'),
});

export const validateSearch = z
  .object({
    walletAddress: requiredString('Wallet address'),
    status: z.string().optional(),
    role: z.string().optional(),
    inParty: z.string().optional(),
  })
  .refine(
    (data) => {
      const { status = '', role = '' } = data;

      const formattedStatus = status
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const formattedRole = role
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      const validStatus = ['approved', 'pending', 'rejected'];
      const validRole = ['admin', 'user', 'party', 'candidate'];

      const invalidStatus = formattedStatus.filter((s) => !validStatus.includes(s));
      const invalidRole = formattedRole.filter((r) => !validRole.includes(r));

      return invalidStatus.length === 0 && invalidRole.length === 0;
    },
    { message: 'Invalid status or role values' }
  );

export const createParty = z.object({
  partyName: requiredString('Party name'),
  partySymbol: requiredString('Party symbol'),
  userId: zodObjectId,
  linkExpiry: z.coerce
    .number({
      required_error: 'Link expiry is required',
      invalid_type_error: 'Link expiry must be a number',
    })
    .min(1, { message: 'Link expiry must be at least 1 day' })
    .max(30, { message: 'Link expiry cannot be more than 30 days' }),
});

export const validateEmailQuery = z.object({
  walletAddress: requiredString('Wallet address'),
  token: requiredString('Token'),
});

export const validatePartyId = z.object({
  partyId: zodObjectId,
});

export const updateParty = z.object({
  contactEmail: requiredString('Contact email').email('Invalid email format'),
  description: requiredString('Description'),
  abbreviation: requiredString('Abbreviation'),
  website: requiredString('Website').url('Invalid URL format'),
  contactPhone: requiredString('Contact phone').regex(/^\d{10,15}$/, {
    message: 'Phone number must be between 10 and 15 digits and contain only digits',
  }),
  headquarters: requiredString('Headquarters'),
  foundedOn: requiredString('Founded on'),
  facebook_url: requiredString('Facebook URL').url('Invalid URL format').optional(),
  twitter_url: requiredString('Twitter URL').url('Invalid URL format').optional(),
  instagram_url: requiredString('Instagram URL').url('Invalid URL format').optional(),
});

export const createElection = z
  .object({
    title: requiredString('Title')
      .min(10, { message: 'Title must be at least 10 characters long' })
      .max(100, { message: 'Title must be at most 100 characters long' })
      .refine((val) => /^[a-zA-Z0-9 ]+$/.test(val), {
        message: 'Title can only contain letters, numbers, and spaces (no special characters)',
      })
      .transform((val) => val.replace(/\s+/g, '').toLowerCase()),

    purpose: requiredString('Purpose')
      .min(10, { message: 'Purpose must be at least 10 characters long' })
      .max(1000, { message: 'Purpose must be at most 1000 characters long' })
      .refine((val) => /^[a-zA-Z0-9 -]+$/.test(val), {
        message:
          'Purpose can only contain letters, numbers, spaces, and hyphens (no special characters)',
      })
      .transform((val) => val.replace(/\s+/g, '').toLowerCase()),

    startDate: requiredString('Start date')
      .datetime({ message: 'Invalid start date format' })
      .refine(
        (val) => {
          const now = new Date();
          const start = new Date(val);
          return start.getTime() - now.getTime() >= ONE_DAY_MS;
        },
        { message: 'Start date must be at least 1 day from today' }
      ),

    endDate: requiredString('End date').datetime({ message: 'Invalid end date format' }),

    electionType: z.enum(['LOK_SABHA', 'VIDHAN_SABHA', 'MUNICIPAL', 'PANCHAYAT', 'BY_ELECTION'], {
      errorMap: () => ({ message: 'Invalid election type' }),
    }),

    constituencyId: zodObjectId,
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end.getTime() - start.getTime() >= ONE_DAY_MS;
    },
    {
      message: 'End date must be at least 1 day after start date',
      path: ['endDate'],
    }
  );

export const addCandidateSchema = z.object({
  electionId: zodObjectId,
  candidates: z.array(
    z.object({
      userId: zodObjectId,
      description: requiredString('Description')
        .min(10, { message: 'Description must be at least 10 characters long' })
        .max(1000, { message: 'Description must be at most 1000 characters long' })
        .refine((val) => /^[a-zA-Z0-9 -]+$/.test(val), {
          message:
            'Description can only contain letters, numbers, spaces, and hyphens (no special characters)',
        })
        .transform((val) => val.replace(/\s+/g, '').toLowerCase()),
    })
  ),
});

export const voteSchema = z.object({
  electionId: zodObjectId,
  candidateId: zodObjectId,
});

export const ResultSchema = z.object({
  electionId: zodObjectId,
});

export const validatePartyIdAndWalletAddress = z.object({
  partyId: zodObjectId,
  walletAddress: requiredString('Wallet address'),
});

export const validateAadharImage = imageFileSchema;
export const validateProfileImage = imageFileSchema;
export const validatePartyImage = imageFileSchema;
