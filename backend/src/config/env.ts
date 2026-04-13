import path from 'node:path';
import { z } from 'zod';
import dotenv from 'dotenv';

const backendRoot = path.resolve(__dirname, '../..');
// Önce backend kökündeki dosyalar — npm/cwd repo kökünde olsa bile Supabase DATABASE_URL yüklensin
dotenv.config({ path: path.join(backendRoot, '_env') });
dotenv.config({ path: path.join(backendRoot, '.env') });
// İsteğe bağlı: çalışma dizinindeki .env (monorepo köküne koyanlar için ek anahtarlar)
dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().optional().default('localhost'),
  DB_PORT: z.coerce.number().optional().default(5432),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),

  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Security
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  // Public URLs
  FRONTEND_URL: z.string().url().optional().default('http://localhost:5173'),
  BACKEND_PUBLIC_URL: z.string().url().optional(),

  // Microsoft Entra ID
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().optional(),
  MICROSOFT_REDIRECT_URI: z.string().url().optional(),
});

type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
  if (env.NODE_ENV === 'development') {
    const dbMode = env.DATABASE_URL
      ? 'DATABASE_URL'
      : `DB_HOST=${env.DB_HOST}:${env.DB_PORT} db=${env.DB_NAME ?? '(unset)'}`;
    console.log(`[env] Loaded backend/.env · database: ${dbMode}`);
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment variable validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export default env;

