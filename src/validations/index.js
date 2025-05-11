import * as z from 'zod';
import { ObjectId } from 'mongodb';

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

const MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED_FIELD_TYPES = [
  'first_name',
  'last_name',
  'phone_number',
  'email',
  'update_location',
  'profile_image',
  'aadhar_image',
];

const zodObjectId = z.string().refine((val) => ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

const imageFileSchema = z
  .any()
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
  wallet_address: z.string().transform((data, ctx) => {
    if (data.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid wallet address',
      });
      return z.NEVER;
    }
    return data;
  }),
});

export const updateUserSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(2, { message: 'First name must be at least 2 characters long' }),
  last_name: z.string().trim().min(2, { message: 'Last name must be at least 2 characters long' }),
  phone_number: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, {
      message: 'Phone number must be between 10 and 15 digits and contain only digits',
    }),
  email: z
    .string()
    .trim()
    .email({ message: 'Invalid email format' })
    .max(50, { message: 'Email must be less than or equal to 50 characters' }),
  state_id: zodObjectId,
  district_id: zodObjectId,
  mandal_id: zodObjectId,
  constituency_id: zodObjectId,
});

export const approveUserSchema = z.object({
  user_id: zodObjectId,
});

export const rejectUserSchema = z
  .object({
    user_id: zodObjectId,
    reason: z.string().min(10, {
      message: 'Reason must be at least 10 characters long',
    }),
    rejected_fields: z
      .array(z.string())
      .min(1, {
        message: 'At least one field must be specified for rejection',
      })
      .max(5, {
        message: 'You can reject up to 5 fields at a time',
      }),
  })
  .refine(
    (data) => {
      const invalidFields = data.rejected_fields.filter(
        (field) => !ALLOWED_FIELD_TYPES.includes(field)
      );
      if (invalidFields.length > 0) {
        return false;
      }
      return true;
    },
    {
      message: `Invalid field(s) specified for rejection: ${ALLOWED_FIELD_TYPES.join(', ')}`,
    }
  );

export const createElectionSchema = z.object({
  election_name: z.string().nonempty('Election name is required'),
  election_start_time: z
    .string()
    .nonempty('Election start time is required')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
  election_end_time: z
    .string()
    .nonempty('Election end time is required')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
});

export const validateUserId = z.object({
  user_id: zodObjectId,
});

export const createParty = z.object({
  party_name: z.string().nonempty('Party name is required'),
  party_symbol: z.string().nonempty('Party symbol is required'),
  user_id: zodObjectId,
  link_expiry: z.coerce
    .number({
      required_error: 'Link expiry is required',
      invalid_type_error: 'Link expiry must be a number',
    })
    .min(1, 'Link expiry must be at least 1 day')
    .max(30, 'Link expiry cannot be more than 30 days'),
});

export const validateEmailQuery = z.object({
  email: z.string().email('Invalid email format'),
  token: z.string().nonempty('Token is required'),
});

export const updateParty = z.object({
  contact_email: z.string().email('Invalid email format'),
  description: z.string(),
  abbreviation: z.string(),
  website: z.string().url('Invalid URL format'),
  contact_phone: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, {
      message: 'Phone number must be between 10 and 15 digits and contain only digits',
    }),
});

// All Image validations
export const validateAadharImage = imageFileSchema;
export const validateProfileImage = imageFileSchema;
export const validatePartyImage = imageFileSchema;
