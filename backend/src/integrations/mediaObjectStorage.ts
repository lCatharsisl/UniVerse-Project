import { randomBytes } from 'node:crypto';
import path from 'node:path';
import {
  getDefaultStorageBucket,
  isSupabaseStorageConfigured,
  uploadToSupabasePublic,
} from './supabaseStorage';

/**
 * Görseller ve dosyalar yalnızca Supabase Storage’a yazılır (yerel disk yok).
 * Test ortamında env yoksa no-op değil — route testleri yüklemeyi çağırmıyorsa sorun olmaz.
 */
export function requireSupabaseMediaStorage(): void {
  if (process.env.NODE_ENV === 'test') return;
  if (!isSupabaseStorageConfigured()) {
    throw new Error(
      'Medya yüklemek için backend/.env içinde SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı olmalı.'
    );
  }
}

/** Supabase’e public URL dönecek şekilde buffer yükler. */
export async function storePublicUpload(options: {
  pathPrefix: string;
  buffer: Buffer;
  originalFilename: string;
  contentType: string;
  bucket?: string;
}): Promise<string> {
  requireSupabaseMediaStorage();
  const ext = path.extname(options.originalFilename) || '';
  const prefix = options.pathPrefix.replace(/^\/+|\/+$/g, '');
  const key = `${prefix}/${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
  return uploadToSupabasePublic({
    objectPath: key,
    body: options.buffer,
    contentType: options.contentType,
    bucket: options.bucket ?? getDefaultStorageBucket(),
  });
}
