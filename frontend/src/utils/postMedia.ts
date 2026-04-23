import { resolveMediaUrl } from './resolveMediaUrl';

/** Attachment path from API (e.g. /uploads/images-123.mp4). */
export function isPostVideoUrl(path: string | null | undefined): boolean {
  if (!path) return false;
  const p = path.split('?')[0].toLowerCase();
  return p.endsWith('.mp4');
}

/** Gönderi görselleri: API yolu, Supabase veya dev sunucu kökü — `resolveMediaUrl` ile aynı kurallar. */
export function resolveSocialPostMediaUrl(raw: string): string {
  return resolveMediaUrl(raw);
}
