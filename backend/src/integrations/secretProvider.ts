import fs from 'node:fs';
import path from 'node:path';

type SecretMap = Record<string, string>;

const DEFAULT_SECRET_KEYS = [
  'SESSION_SECRET',
  'DB_PASSWORD',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VIRUSTOTAL_API_KEY',
] as const;

function getSecretsFilePath() {
  const rawPath = process.env.SECRETS_FILE_PATH;
  if (!rawPath) return null;
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

function loadSecretsFromFile(): SecretMap {
  const filePath = getSecretsFilePath();
  if (!filePath || !fs.existsSync(filePath)) return {};

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return Object.entries(parsed as Record<string, unknown>).reduce<SecretMap>((acc, [key, value]) => {
    if (typeof value === 'string') acc[key] = value;
    return acc;
  }, {});
}

/** Map SESSION_SECRET → session-secret (Azure Key Vault secret naming). */
function envVarToKvSecretName(envName: string) {
  return envName.toLowerCase().replace(/_/g, '-');
}

function parseKvMapping(): Record<string, string> {
  const raw = process.env.AZURE_KEY_VAULT_MAPPING;
  if (!raw?.trim()) return {};
  try {
    const o = JSON.parse(raw) as unknown;
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function hydrateFromAzureKeyVault(secretNames: string[]): Promise<void> {
  const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
  if (!vaultUrl) throw new Error('AZURE_KEY_VAULT_URL is required when SECRET_PROVIDER=azure-keyvault');

  const { DefaultAzureCredential } = await import('@azure/identity');
  const { SecretClient } = await import('@azure/keyvault-secrets');
  const client = new SecretClient(vaultUrl, new DefaultAzureCredential());
  const nameMap = parseKvMapping();

  for (const secretName of secretNames) {
    if (process.env[secretName]) continue;
    const kvName = nameMap[secretName] ?? envVarToKvSecretName(secretName);
    try {
      const bundle = await client.getSecret(kvName);
      const val = bundle.value;
      if (val && !process.env[secretName]) {
        process.env[secretName] = val;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[secretProvider] Key Vault lookup failed for ${secretName} (secret ${kvName}): ${msg}`);
    }
  }
}

/**
 * Hydrate secrets before Zod parses `process.env`.
 * Supports: env (no-op), file (JSON file), azure-keyvault.
 */
export async function preflightSecrets(secretNames: string[] = [...DEFAULT_SECRET_KEYS]): Promise<void> {
  const provider = String(process.env.SECRET_PROVIDER || 'env').toLowerCase();

  if (provider === 'env') return;

  if (provider === 'file') {
    const secrets = loadSecretsFromFile();
    for (const secretName of secretNames) {
      if (!process.env[secretName] && secrets[secretName]) {
        process.env[secretName] = secrets[secretName];
      }
    }
    return;
  }

  if (provider === 'azure-keyvault') {
    await hydrateFromAzureKeyVault(secretNames);
    return;
  }

  console.warn(`[secretProvider] Unknown SECRET_PROVIDER=${provider}, skipping`);
}
