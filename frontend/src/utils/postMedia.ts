/** Attachment path from API (e.g. /uploads/images-123.mp4). */
export function isPostVideoUrl(path: string | null | undefined): boolean {
  if (!path) return false;
  const p = path.split('?')[0].toLowerCase();
  return p.endsWith('.mp4');
}

export function resolveSocialPostMediaUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const normalized = value.startsWith('/api/uploads/')
    ? value.replace('/api/uploads/', '/uploads/')
    : value.startsWith('api/uploads/')
      ? value.replace('api/uploads/', '/uploads/')
      : value.startsWith('uploads/')
        ? `/${value}`
        : value;
  const backendOrigin = `${window.location.protocol}//${window.location.hostname}:3000`;
  return `${backendOrigin}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}
