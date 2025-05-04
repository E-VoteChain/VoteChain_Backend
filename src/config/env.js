import dotenv from 'dotenv';
import * as z from 'zod';
import process from 'process';
import { AppError } from '../utils/AppError.js';
import { BAD_REQUEST } from '../constants/index.js';

dotenv.config();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number().default(3000),
    JWT_ACCESS_SECRET: z.string().describe('JWT secret key'),
    JWT_ACCESS_EXPIRATION_DAYS: z.coerce
      .number()
      .default(30)
      .describe('Access token expiration time in days'),
    CLOUDINARY_CLOUD_NAME: z.string().describe('Cloudinary cloud name'),
    CLOUDINARY_API_KEY: z.string().describe('Cloudinary API key'),
    CLOUDINARY_API_SECRET: z.string().describe('Cloudinary API secret'),

    CORS_ORIGIN: z.string().default('http://localhost:5173').describe('CORS origin'),
    CORS_CREDENTIALS: z.coerce.boolean().default(true).describe('CORS credentials'),
  })
  .passthrough();

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new AppError(
    `❌ Invalid environment variables: ${JSON.stringify(parsedEnv.error.format())}`,
    BAD_REQUEST 
  );
}

const env = parsedEnv.data;

export default {
  env: env.NODE_ENV,
  port: env.PORT,
  jwt: {
    access_secret: env.JWT_ACCESS_SECRET,
    accessExpirationDays: env.JWT_ACCESS_EXPIRATION_DAYS,
  },
  cloudinary: {
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  },
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: env.CORS_CREDENTIALS,
  },
};
