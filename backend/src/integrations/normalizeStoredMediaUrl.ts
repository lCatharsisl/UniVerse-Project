import { getDefaultStorageBucket } from './supabaseStorage';

/**
 * Eski kayıtlar `/uploads/...` veya `social/...` gibi göreli yollar kullanabilirdi.
 * Medya artık yalnızca Supabase Storage’da olduğu için API cevaplarında kamu URL’ye çözülür.
 */
export function normalizeStoredMediaUrl(raw: unknown): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  let rest = trimmed.replace(/^\/+/, '');

  // Host olmadan kopyalanmış public path
  if (/^storage\/v1\/object\/public\//i.test(rest)) {
    return supabaseUrl ? `${supabaseUrl}/${rest}` : `/${rest}`;
  }

  if (!supabaseUrl) return trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;

  const bucket = getDefaultStorageBucket();
  let objectKey = rest;
  if (objectKey.startsWith('uploads/')) {
    objectKey = objectKey.slice('uploads'.length).replace(/^\/+/, '');
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectKey}`;
}

/** Feed / gönderi satırlarında `image_url` alanını normalize eder. */
export function withNormalizedPostImageUrl<T extends Record<string, unknown>>(row: T): T {
  if (!('image_url' in row)) return row;
  const v = row.image_url;
  if (v == null || (typeof v === 'string' && v.trim() === '')) return row;
  const next = normalizeStoredMediaUrl(v);
  return { ...row, image_url: next } as T;
}

export function withNormalizedPostImageUrls<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((r) => withNormalizedPostImageUrl(r));
}

const SOCIAL_ROW_MEDIA_KEYS = ['image_url', 'avatar_url'] as const;

/** Feed / profil gönderi kartı: gönderi medyası + yazar avatarı. */
export function withNormalizedSocialFeedRow<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row } as Record<string, unknown>;
  for (const key of SOCIAL_ROW_MEDIA_KEYS) {
    if (!(key in out)) continue;
    const v = out[key];
    if (v == null || (typeof v === 'string' && v.trim() === '')) continue;
    out[key] = normalizeStoredMediaUrl(v);
  }
  return out as T;
}

export function withNormalizedSocialFeedRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((r) => withNormalizedSocialFeedRow(r));
}

