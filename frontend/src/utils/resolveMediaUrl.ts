/**
 * Resolves upload paths from the API (`/uploads/...`) to a browser URL.
 * - `VITE_UPLOADS_BASE_URL` or `VITE_API_ORIGIN` (e.g. https://api.onrender.com) in production.
 * - Otherwise relative path for dev (Vite proxy to backend).
 */
export function resolveMediaUrl(path: string | null | undefined): string {
  if (path == null || path === '') return '';
  const p = path.trim();
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  const uploads = (import.meta.env.VITE_UPLOADS_BASE_URL as string | undefined)?.trim();
  const apiOrigin = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.trim();
  const base = (uploads || apiOrigin || '').replace(/\/$/, '');
  const normalized = p.startsWith('/') ? p : `/${p}`;
  return base ? `${base}${normalized}` : normalized;
}
