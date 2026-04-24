/**
 * Resolves upload paths from the API (`/uploads/...`) to an absolute browser URL.
 * - HTTPS (Supabase vb.) olduğu gibi döner.
 * - Yerel diske yazılmış `/uploads/...` yolları backend'in static handler'ına yönlendirilir.
 *   Dosya silinmişse `<img onError>` (örn. FeedAvatarImage) baş harf avatar'a düşer.
 * - Geliştirmede `VITE_UPLOADS_BASE_URL` yoksa varsayılan `http://localhost:3000` (Vite 5173 yerine API'ye gider).
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

  const explicit = (import.meta.env.VITE_UPLOADS_BASE_URL as string | undefined)?.replace(/\/$/, '');
  const base =
    explicit ?? (import.meta.env.DEV ? 'http://localhost:3000' : '');
  if (base) {
    return `${base}${normalized}`;
  }
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
