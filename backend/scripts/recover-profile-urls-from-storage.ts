/**
 * Postgres'teki boş avatar/cover kolonları — Supabase bucket'ta profiles/{userId}/ altında
 * kalan nesneler için public URL üretip yazmayı dener.
 *
 * Not: Bucket'taki dosyayı silmez; ilk temizlik sadece yanlış eşleşen SQL ile DB linkini kopardıysan toparlar.
 *
 *   npm run db:recover-profile-urls --prefix backend
 */
import '../src/config/loadDotenv';
import { createClient } from '@supabase/supabase-js';
import { query, queryOne, closePool } from '../src/config/db';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

interface FolderItem {
  name: string;
  id?: string | null;
  metadata?: { size?: number } | null;
}

function parseKindTimestamp(filename: string): { kind: 'avatar' | 'cover' | 'other'; ts: number } {
  const m = /^(avatar|cover)-(\d+)-/.exec(filename);
  if (!m) return { kind: 'other', ts: 0 };
  const ts = Number(m[2]) || 0;
  return { kind: m[1] as 'avatar' | 'cover', ts };
}

async function latestForPrefix(
  supabase: ReturnType<typeof createClient>,
  storagePath: string
): Promise<{ avatar: string | null; cover: string | null }> {
  const { data, error } = await supabase.storage.from(bucket).list(storagePath, { limit: 200 });
  if (error || !data?.length) return { avatar: null, cover: null };

  let bestAvatar = { ts: -1 as number, path: '' as string };
  let bestCover = { ts: -1 as number, path: '' as string };

  /** Boş klasör satırlarını mümkün olduğunca atlayıp dosya adına bakıyoruz. */
  const candidates = (data as FolderItem[]).filter((e) => e.name && /\.(jpe?g|png|gif|webp)$/i.test(e.name));

  for (const row of candidates) {
    const name = row.name;
    if (!name.includes('.')) continue;
    const { kind, ts } = parseKindTimestamp(name);
    if (kind === 'avatar' && ts >= bestAvatar.ts) {
      bestAvatar = { ts, path: `${storagePath}/${name}` };
    }
    if (kind === 'cover' && ts >= bestCover.ts) {
      bestCover = { ts, path: `${storagePath}/${name}` };
    }
  }

  let avatarUrl: string | null = null;
  let coverUrl: string | null = null;
  if (bestAvatar.path) {
    avatarUrl = supabase.storage.from(bucket).getPublicUrl(bestAvatar.path).data.publicUrl;
  }
  if (bestCover.path) {
    coverUrl = supabase.storage.from(bucket).getPublicUrl(bestCover.path).data.publicUrl;
  }
  return { avatar: avatarUrl, cover: coverUrl };
}

async function main(): Promise<void> {
  if (!url || !serviceKey) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  /** user_id ile path prefix profiles/{userId} */
  const userIdsFromStudents = await query<{ user_id: number }>('SELECT user_id FROM public.students ORDER BY user_id');
  const userIdsFromStaff = await query<{ user_id: number }>('SELECT user_id FROM public.staff ORDER BY user_id');

  const idSet = new Set<number>();
  for (const r of [...userIdsFromStudents, ...userIdsFromStaff]) idSet.add(r.user_id);

  let updatedProfiles = 0;

  for (const userId of idSet) {
    const bucketPrefix = `profiles/${userId}`;
    const urls = await latestForPrefix(supabase, bucketPrefix);
    const stud = await queryOne<{ avatar_url: string | null; cover_url: string | null }>(
      'SELECT avatar_url, cover_url FROM public.students WHERE user_id = $1',
      [userId]
    );
    const stf = await queryOne<{ avatar_url: string | null; cover_url: string | null }>(
      'SELECT avatar_url, cover_url FROM public.staff WHERE user_id = $1',
      [userId]
    );

    if (!stud && !stf) continue;

    const avatarRef = (stud?.avatar_url ?? stf?.avatar_url ?? '') as string;
    const coverRef = (stud?.cover_url ?? stf?.cover_url ?? '') as string;

    const patchAvatar =
      urls.avatar && (!avatarRef || avatarRef.trim().length === 0) ? urls.avatar : null;
    const patchCover = urls.cover && (!coverRef || coverRef.trim().length === 0) ? urls.cover : null;

    if (patchAvatar || patchCover) {
      if (stud) {
        await query(
          `UPDATE public.students
           SET avatar_url = COALESCE($2::text, avatar_url),
               cover_url = COALESCE($3::text, cover_url)
           WHERE user_id = $1`,
          [userId, patchAvatar as string | null, patchCover as string | null]
        );
      }
      if (stf) {
        await query(
          `UPDATE public.staff
           SET avatar_url = COALESCE($2::text, avatar_url),
               cover_url = COALESCE($3::text, cover_url)
           WHERE user_id = $1`,
          [userId, patchAvatar as string | null, patchCover as string | null]
        );
      }
      if (patchAvatar) {
        await query(`UPDATE public.users SET profile_image_url = $2 WHERE user_id = $1`, [userId, patchAvatar]);
      }
      updatedProfiles += 1;
      console.log(`user_id=${userId} güncellendi (avatar:${Boolean(patchAvatar)} cover:${Boolean(patchCover)})`);
    }
  }

  console.log(`\nBitti. En az bir alan yazılan kullanıcı: ${updatedProfiles}`);
}

void main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void closePool());
