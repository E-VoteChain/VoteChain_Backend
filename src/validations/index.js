import * as z from 'zod';
import { ObjectId } from 'mongodb';

const zodObjectId = z.string().refine((val) => ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
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

export const rejectUserSchema = z.object({
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
});

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
