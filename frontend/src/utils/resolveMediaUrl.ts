/**
 * Resolves upload paths from the API (`/uploads/...`) to a browser URL.
 * - If `VITE_UPLOADS_BASE_URL` is set (e.g. production API origin), prefixes it.
 * - Otherwise returns the path as-is so same-origin + Vite `/uploads` proxy works in dev.
 */
export function resolveMediaUrl(path: string | null | undefined): string {
  if (path == null || path === '') return '';
  const p = path.trim();
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  const base = (import.meta.env.VITE_UPLOADS_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  const normalized = p.startsWith('/') ? p : `/${p}`;
  return base ? `${base}${normalized}` : normalized;
}
