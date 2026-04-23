import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side only: uses the service role key. Never expose this in the browser.
 * Configure in backend/.env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
/** Dashboard’ta oluşturduğunuz bucket adı (çoğu projede `uploads`). */
const defaultBucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

let admin: SupabaseClient | null = null;

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(url && serviceKey);
}

function getClient(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error('Supabase Storage is not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env)');
  }
  if (!admin) {
    admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}

export function getDefaultStorageBucket(): string {
  return defaultBucket;
}

/**
 * Upload a binary object and return its public URL. Bucket must be public, or you must
 * add a "public read" policy in Supabase → Storage → Policies.
 */
export async function uploadToSupabasePublic(options: {
  bucket?: string;
  objectPath: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  const bucket = options.bucket ?? defaultBucket;
  const supabase = getClient();
  const { error } = await supabase.storage.from(bucket).upload(options.objectPath, options.body, {
    contentType: options.contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(options.objectPath);
  return data.publicUrl;
}
