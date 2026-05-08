/**
 * Tek bir gönderinin image_url alanını bucket’taki medyayla eşler (video dahil).
 *
 *   npm run db:recover-post-media -- 18
 *   RECOVER_POST_FORCE=1 npm run db:recover-post-media -- 18   # zaman penceresini yok say
 */
import '../src/config/loadDotenv';
import { createClient } from '@supabase/supabase-js';
import { closePool, query, queryOne } from '../src/config/db';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function tsFromFilename(name: string): number | null {
  const m = /^(\d+)-[a-f0-9]+(?:\.[a-z0-9]+)?$/i.exec(name);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function isPostMediaFilename(name: string): boolean {
  if (!name) return false;
  if (/\.(jpe?g|png|gif|webp|mp4|webm|mov|m4v|mkv|mpeg|ogv)$/i.test(name)) return true;
  return /^(\d+)-[a-f0-9]+$/i.test(name);
}

type Row = {
  post_id: number;
  user_id: number;
  created_at: Date | string;
  image_url: string | null;
};

async function main(): Promise<void> {
  const rawId = process.argv[2] || process.env.RECOVER_POST_ID;
  const postId = Number.parseInt(String(rawId), 10);
  if (!Number.isFinite(postId)) {
    console.error('Kullanım: npm run db:recover-post-media -- <post_id>');
    process.exitCode = 1;
    return;
  }

  if (!url || !serviceKey) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
    process.exitCode = 1;
    return;
  }

  const row = await queryOne<Row>(
    `SELECT post_id, user_id, created_at, image_url FROM public.posts WHERE post_id = $1`,
    [postId]
  );
  if (!row) {
    console.error(`post_id=${postId} bulunamadı.`);
    process.exitCode = 1;
    return;
  }

  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const prefix = `social/posts/${row.user_id}`;
  const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 500 });
  if (error) {
    console.error('Storage list hatası:', error.message);
    process.exitCode = 1;
    return;
  }

  const verbose = String(process.env.RECOVER_POST_VERBOSE || '').toLowerCase() === '1';
  if (verbose) {
    const names = (data || []).map((x) => (x as { name?: string }).name).filter(Boolean);
    console.log(`[verbose] bucket=${bucket} prefix=${prefix}/ satır sayısı=${names.length}`, names.slice(0, 50));
  }

  const anchorMs = new Date(row.created_at).getTime();
  const force = String(process.env.RECOVER_POST_FORCE || '').toLowerCase() === '1' || process.argv.includes('--force');
  const windowMs = force
    ? Number.POSITIVE_INFINITY
    : Number(process.env.RECOVER_POST_WINDOW_MS || DEFAULT_WINDOW_MS);

  type Cand = { name: string; ts: number; diff: number };
  const cands: Cand[] = [];
  for (const item of data || []) {
    const name = (item as { name?: string }).name;
    if (!name || !isPostMediaFilename(name)) continue;
    const ts = tsFromFilename(name);
    if (ts === null) continue;
    const diff = Math.abs(ts - anchorMs);
    if (!force && diff > windowMs) continue;
    cands.push({ name, ts, diff });
  }

  cands.sort((a, b) => a.diff - b.diff);
  if (!cands.length) {
    console.error(
      `Bucket’ta eşleşen medya yok: ${prefix}/ (pencere=${force ? 'kapalı' : `${windowMs} ms`}). RECOVER_POST_FORCE=1 veya daha geniş RECOVER_POST_WINDOW_MS dene.`
    );
    process.exitCode = 1;
    return;
  }

  const pick = cands[0];
  const objectPath = `${prefix}/${pick.name}`;
  const publicUrl = sb.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;

  await query(`UPDATE public.posts SET image_url = $1 WHERE post_id = $2`, [publicUrl, postId]);

  console.log(`Güncellendi post_id=${postId}`);
  console.log(`  Dosya (timestamp ile): ${pick.name} Δt=${pick.diff} ms`);
  console.log(`  Önceki image_url: ${row.image_url ?? '(null)'}`);
  console.log(`  Yeni: ${publicUrl}`);
}

void main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void closePool());
