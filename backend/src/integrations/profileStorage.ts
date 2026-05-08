import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { getDefaultStorageBucket, uploadToSupabasePublic } from './supabaseStorage';
import { requireSupabaseMediaStorage } from './mediaObjectStorage';

/**
 * Avatar / kapak: yalnızca Supabase Storage (public bucket / policy ile okunabilir).
 */
export async function storeProfileImage(
  file: Express.Multer.File,
  kind: 'avatar' | 'cover',
  userId: number
): Promise<string> {
  if (!file.buffer) {
    throw new Error('Profile image upload must use memory storage (file.buffer is missing).');
  }
  requireSupabaseMediaStorage();
  const ext = path.extname(file.originalname) || '.jpg';
  const contentType = file.mimetype || 'image/jpeg';
  const key = `profiles/${userId}/${kind}-${Date.now()}-${randomBytes(5).toString('hex')}${ext}`;
  return uploadToSupabasePublic({
    objectPath: key,
    body: file.buffer,
    contentType,
    bucket: getDefaultStorageBucket(),
  });
}

/** Topluluk avatar/kapak: yalnızca Supabase Storage. */
export async function storeCommunityImage(
  file: Express.Multer.File,
  kind: 'avatar' | 'cover',
  communityId: number
): Promise<string> {
  if (!file.buffer) {
    throw new Error('Community image upload must use memory storage (file.buffer is missing).');
  }
  requireSupabaseMediaStorage();
  const ext = path.extname(file.originalname) || '.jpg';
  const contentType = file.mimetype || 'image/jpeg';
  const key = `communities/${communityId}/${kind}-${Date.now()}-${randomBytes(5).toString('hex')}${ext}`;
  return uploadToSupabasePublic({
    objectPath: key,
    body: file.buffer,
    contentType,
    bucket: getDefaultStorageBucket(),
  });
}
