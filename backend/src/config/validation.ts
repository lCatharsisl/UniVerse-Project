import { z } from 'zod';

/**
 * Environment variables schema
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  
  // Database
  DB_HOST: z.string(),
  DB_PORT: z.string(),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_MAX_CONNECTIONS: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional(),
});

/**
 * Validate environment variables
 * Throws error if validation fails
 */
export const validateEnv = (): void => {
  try {
    envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Get validated environment variables
 */
export const getEnv = () => {
  return envSchema.parse(process.env);
};
