/** @internal — test için */
export function normalizeApiBaseUrl(raw: string | undefined | null): string {
  const t = raw?.trim();
  if (!t) return '/api';
  const base = t.replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
}

/** Geliştirme modunda `localhost` / `127.0.0.1` adresi yanlıştır — başka cihaz/tablet localhost’unu kendi PC’si yapar */
function stripLoopbackOriginInDev(url: string | undefined): string | undefined {
  const t = url?.trim();
  if (!t || !import.meta.env.DEV) return t;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(t))
    return undefined;
  return t;
}

/** @internal */
export function uploadsBaseFromApiRoot(raw: string | undefined | null): string {
  const t = raw?.trim().replace(/\/+$/, '');
  if (!t) return '';
  return t.replace(/\/api$/, '') || t;
}

/**
 * Axios `baseURL`. Geliştirmede `/api` (Vite proxy). Production’da istemci API’den
 * ayrı host’taysa `VITE_API_BASE_URL` (örn. `https://api.example.com` veya `…/api`).
 */
export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(
    stripLoopbackOriginInDev(import.meta.env.VITE_API_BASE_URL as string | undefined),
  );
}

/**
 * `/uploads/...` için kök (şema + host, `/api` yok). Önce `VITE_UPLOADS_BASE_URL`,
 * yoksa `VITE_API_BASE_URL`’den türetilir.
 */
export function getUploadsBaseUrl(): string {
  const uploadsRaw = stripLoopbackOriginInDev(import.meta.env.VITE_UPLOADS_BASE_URL as string | undefined);
  const explicit = uploadsRaw ? uploadsRaw.trim().replace(/\/+$/, '') : '';
  if (explicit) return explicit;

  return uploadsBaseFromApiRoot(
    stripLoopbackOriginInDev(import.meta.env.VITE_API_BASE_URL as string | undefined),
  );
}
