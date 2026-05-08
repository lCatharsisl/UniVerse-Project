import './loadDotenv';
import { z } from 'zod';

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
  /** Boş değilse `app.listen(PORT, host)` — LAN’da doğrudan API için örn. `0.0.0.0` */
  LISTEN_HOST: z.string().min(1).optional(),
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),

  // Security
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  // Public URLs
  FRONTEND_URL: z.string().url().optional().default('http://localhost:5173'),
  BACKEND_PUBLIC_URL: z.string().url().optional(),
  CORS_ORIGINS: z.string().optional(),
  MONITORING_ENABLED: z.coerce.boolean().optional().default(false),
  MONITORING_WEBHOOK_URL: z.string().url().optional(),

  // Microsoft Entra ID (optional)
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().optional(),
  MICROSOFT_REDIRECT_URI: z.string().url().optional(),

  AUTHORIZATION_AUDIT_ENABLED: z.coerce.boolean().optional().default(false),
  TRACEPARENT_LOGGING_ENABLED: z.coerce.boolean().optional().default(true),
  SECRET_PROVIDER: z.enum(['env', 'file', 'azure-keyvault']).optional().default('env'),
  SECRETS_FILE_PATH: z.string().optional(),
  AZURE_KEY_VAULT_URL: z.string().url().optional(),
  /** JSON: { \"SESSION_SECRET\": \"session-secret-custom-name-in-vault\" } */
  AZURE_KEY_VAULT_MAPPING: z.string().optional(),
  MALWARE_SCAN_MODE: z.enum(['disabled', 'mock', 'virustotal']).optional().default('disabled'),
  MALWARE_SCAN_FAIL_ON_ERROR: z.coerce.boolean().optional().default(false),
  VIRUSTOTAL_API_KEY: z.string().optional(),

  /** Varsayılan: admin@yasar.edu.tr — ayrılmış platform yöneticisi kimliği (kayıtta engellenir, şifre politikası bağlanır) */
  PLATFORM_ADMIN_EMAIL: z.string().email().optional(),

  /** Web Push (VAPID). Üçü de tanımlı değilse push gönderilmez; tanımlıysa gönderilir. */
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  /** mailto:you@example.com veya https://your-site.com */
  VAPID_SUBJECT: z.string().min(1).optional(),
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
