import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDefaultStorageBucket, isSupabaseStorageConfigured, uploadToSupabasePublic } from './supabaseStorage';

/**
 * Persists a chat image from multer **memory** storage and returns a URL to store in DB
 * (either a Supabase public https URL or `/uploads/...` for local dev without Storage).
 */
export async function storeMessagingImage(
  file: Express.Multer.File,
  conversationId: number
): Promise<string> {
  if (!file.buffer) {
    throw new Error('Messaging upload must use memory storage (file.buffer is missing).');
  }
  const ext = path.extname(file.originalname) || '.jpg';
  const contentType = file.mimetype || 'application/octet-stream';

  if (isSupabaseStorageConfigured()) {
    const key = `messaging/${conversationId}/${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
    return uploadToSupabasePublic({
      objectPath: key,
      body: file.buffer,
      contentType,
      bucket: getDefaultStorageBucket(),
    });
  }

  const uploadDir = path.join(process.cwd(), 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const filename = `images-${uniqueSuffix}${ext}`;
  await fs.writeFile(path.join(uploadDir, filename), file.buffer);
  return `/uploads/${filename}`;
}
