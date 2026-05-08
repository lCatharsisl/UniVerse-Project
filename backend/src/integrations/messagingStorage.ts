import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { getDefaultStorageBucket, uploadToSupabasePublic } from './supabaseStorage';
import { requireSupabaseMediaStorage } from './mediaObjectStorage';

/** Sohbet ekleri — yalnızca Supabase Storage. */
export async function storeMessagingImage(
  file: Express.Multer.File,
  conversationId: number
): Promise<string> {
  if (!file.buffer) {
    throw new Error('Messaging upload must use memory storage (file.buffer is missing).');
  }
  requireSupabaseMediaStorage();
  const ext = path.extname(file.originalname) || '.jpg';
  const contentType = file.mimetype || 'application/octet-stream';
  const key = `messaging/${conversationId}/${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
  return uploadToSupabasePublic({
    objectPath: key,
    body: file.buffer,
    contentType,
    bucket: getDefaultStorageBucket(),
  });
}
