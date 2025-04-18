import * as z from 'zod';

export const register_user = z.object({
  wallet_address: z.string().nonempty('Wallet address is required'),
});

export const updateUserSchema = z.object({
  first_name: z
    .string({
      required_error: 'First name is required',
    })
    .min(2, {
      message: 'First name must be at least 2 characters long',
    }),
  last_name: z
    .string({
      required_error: 'Last name is required',
    })
    .min(2, {
      message: 'Last name must be at least 2 characters long',
    }),
  phone_number: z
    .string({
      required_error: 'Phone number is required',
    })
    .min(10, {
      message: 'Phone number must be at least 10 digits',
    })
    .max(15, {
      message: 'Phone number must be at most 15 digits',
    })
    .regex(/^\d+$/, {
      message: 'Phone number must contain only digits',
    }),
  email: z.string().refine(
    (val) => {
      return !val || val.length <= 50;
    },
    {
      message: 'Email must be less than 50 characters',
    }
  ),
  state: z
    .string()
    .min(1, {
      message: 'State is required',
    })
    .trim()
    .toLowerCase(),
  district: z
    .string()
    .min(1, {
      message: 'District is required',
    })
    .trim()
    .toLowerCase(),
  mandal: z
    .string()
    .min(1, {
      message: 'Mandal is required',
    })
    .trim()
    .toLowerCase(),
  constituency: z
    .string()
    .min(1, {
      message: 'Constituency is required',
    })
    .trim()
    .toLowerCase(),
});

export const approve_user_schema = z.object({
  wallet_address: z.string(),
});

export const reject_user_schema = z.object({
  wallet_address: z.string(),
});

export const create_election_schema = z.object({
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

export const location_slug_validation = z.object({
  state: z.string().nonempty('State is required').trim().toLowerCase(),
  district: z.string().nonempty('District is required').trim().toLowerCase(),
  mandal: z.string().nonempty('Mandal is required').trim().toLowerCase(),
  constituency: z.string().nonempty('Constituency is required').trim().toLowerCase(),
});
