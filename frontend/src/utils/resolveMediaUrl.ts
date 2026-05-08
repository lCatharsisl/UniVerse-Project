import { getUploadsBaseUrl } from './apiBase';

function supabasePublicObjectUrl(uploadsNormalizedPath: string): string | undefined {
  const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '');
  if (!projectUrl) return undefined;
  const bucket = String(import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? 'uploads').trim();
  let key = uploadsNormalizedPath.replace(/^\/+/, '');
  if (key.toLowerCase().startsWith('uploads/')) {
    key = key.slice('uploads'.length).replace(/^\/+/, '');
  }
  if (!key) return undefined;
  return `${projectUrl}/storage/v1/object/public/${bucket}/${key}`;
}

/**
 * Resolves upload paths from the API (`/uploads/...`) to an absolute browser URL.
 * - HTTPS (Supabase vb.) olduğu gibi döner.
 * - Yerel diske yazılmış `/uploads/...` yolları backend'in static handler'ına yönlendirilir.
 *   Dosya silinmişse `<img onError>` (örn. FeedAvatarImage) baş harf avatar'a düşer.
 * - Geliştirmede kök tanımlı değilse göreli `/uploads/...` (aynı origin + Vite proxy; tablet için gerekli).
 * - Production'da `VITE_UPLOADS_BASE_URL` veya `VITE_API_BASE_URL` tanımlayın (ayrı Render servisleri).
 */
export function resolveMediaUrl(path: string | null | undefined): string {
  if (path == null || path === '') return '';
  const p = path.trim();
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://')) return p;

  const normalizedPath = p
    .replace(/^\/?api\/uploads\//, '/uploads/')
    .replace(/^\/?upload\//, '/uploads/')
    .replace(/^\/?uploads\//, '/uploads/');
  const normalized = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;

  const base = getUploadsBaseUrl();
  if (base) {
    return `${base.replace(/\/$/, '')}${normalized}`;
  }
  const supa = supabasePublicObjectUrl(normalized);
  if (supa) return supa;
  return normalized;
}

/**
 * img / `src` için: `resolveMediaUrl` boş string döndüğünde React
 * "An empty string was passed to the src attribute" uyarısını engellemek için `undefined` döner.
 */
export function toImgSrc(path: string | null | undefined): string | undefined {
  const s = resolveMediaUrl(path);
  return s && s.trim() ? s : undefined;
}
