import dotenv from 'dotenv';
import * as z from 'zod';
import process from 'process';

dotenv.config();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number().default(3000),
    JWT_ACCESS_SECRET: z.string().describe('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: z.coerce
      .number()
      .default(30)
      .describe('Access token expiration time in minutes'),
  })
  .passthrough();

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Invalid environment variables');
}

const env = parsedEnv.data;

export default {
  env: env.NODE_ENV,
  port: env.PORT,
  jwt: {
    access_secret: env.JWT_ACCESS_SECRET,
    accessExpirationMinutes: 30,
  },
};
