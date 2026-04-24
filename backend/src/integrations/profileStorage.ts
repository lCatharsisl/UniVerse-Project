import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDefaultStorageBucket, isSupabaseStorageConfigured, uploadToSupabasePublic } from './supabaseStorage';

/**
 * Avatar / kapak görselleri: Supabase Storage bucket (ör. `uploads`) veya lokal `uploads/` klasörü.
 */
export async function storeProfileImage(
  file: Express.Multer.File,
  kind: 'avatar' | 'cover',
  userId: number
): Promise<string> {
  if (!file.buffer) {
    throw new Error('Profile image upload must use memory storage (file.buffer is missing).');
  }
  const ext = path.extname(file.originalname) || '.jpg';
  const contentType = file.mimetype || 'image/jpeg';

  if (isSupabaseStorageConfigured()) {
    const key = `profiles/${userId}/${kind}-${Date.now()}-${randomBytes(5).toString('hex')}${ext}`;
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
  const filename = `${kind}-${uniqueSuffix}${ext}`;
  await fs.writeFile(path.join(uploadDir, filename), file.buffer);
  return `/uploads/${filename}`;
}
