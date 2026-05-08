import { resolveMediaUrl } from './resolveMediaUrl';

const IMAGE_SUFFIX = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;

/** Attachment path from API — mp4 vb. uzantılar ve gönderi medyasında uzantısız Storage anahtarı. */
export function isPostVideoUrl(path: string | null | undefined): boolean {
  if (!path) return false;
  const p = path.split('?')[0];
  const lower = p.toLowerCase();
  if (IMAGE_SUFFIX.test(lower)) return false;
  if (/\.(mp4|webm|mov|m4v|mkv|mpeg|ogv)(\?|$)/i.test(lower)) return true;
  // Supabase public URL: .../uploads/social/posts/{userId}/{ts}-{random} (çoğu zaman uzantılı; yoksa videoda deneyelim)
  return /\/social\/posts\//i.test(p);
}

/** Gönderi görselleri: API yolu, Supabase veya dev sunucu kökü — `resolveMediaUrl` ile aynı kurallar. */
export function resolveSocialPostMediaUrl(raw: string): string {
  return resolveMediaUrl(raw);
}

/**
 * Bazı tarayıcılar MP4 için `#t=` ile ilk saniyeyi poster gibi çözer.
 * Canvas poster üretilemediğinde yedek olarak kullanılır (URL'de zaten # varsa dokunulmaz).
 */
export function videoSrcWithFirstFrameHint(url: string): string {
  if (!url || url.includes('#')) return url;
  return `${url}#t=0.001`;
}
