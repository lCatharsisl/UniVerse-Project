/**
 * Resolves upload paths from the API (`/uploads/...`) to an absolute browser URL.
 * - HTTPS (Supabase vb.) olduğu gibi döner.
 * - Eski DB’de kalan **yalnızca diske yazılmış** `avatar-*` / `cover-*` yolları — dosya artık yoksa 404 üretmesin
 *   diye (Supabase’e geçilene kadar) boş string döndürür; baş harf avatar kullanılır.
 *   Eski yolu yine de denemek için: `VITE_ALLOW_LOCAL_LEGACY_AVATAR_URLS=true`
 * - Geliştirmede `VITE_UPLOADS_BASE_URL` yoksa varsayılan `http://localhost:3000` (Vite 5173 yerine API’ye gider).
 */
const LEGACY_DISK_AVATAR_OR_COVER = /^\/uploads\/(avatar|cover)-/i;

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

  const allowLegacy =
    (import.meta.env.VITE_ALLOW_LOCAL_LEGACY_AVATAR_URLS as string | undefined) === 'true';
  if (LEGACY_DISK_AVATAR_OR_COVER.test(normalized) && !allowLegacy) {
    return '';
  }

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
