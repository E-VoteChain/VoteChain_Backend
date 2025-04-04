import dotenv from 'dotenv';
import * as z from 'zod';

dotenv.config();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number().default(3000),
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
};
