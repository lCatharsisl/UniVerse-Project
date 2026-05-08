/**
 * Bucket’taki dosyaları Postgres’teki kayıtlarla yeniden eşler.
 *
 * - social/posts/{user_id}/{unixMs}-{hex}.ext → posts.image_url (created_at’a yakın zaman; **görsel + video**)
 * - communities/{community_id}/avatar-|cover-* → communities.avatar_url / cover_url
 * - applications/community-events/{id}/ → cv_file_url
 * - applications/community-jobs/{id}/ → cv_file_url
 * - lost-found/lost|found/{user_id}/ → ilgili item’a lost_item_images / found_item_images INSERT
 *
 * Profiller: npm run db:recover-profile-urls
 * Messaging: otomatik eş güvenilir değildir (satır bağlantısı yok).
 *
 *   npm run db:recover-all-storage-urls --prefix backend
 */
import '../src/config/loadDotenv';
import { createClient } from '@supabase/supabase-js';
import { closePool, query, queryOne } from '../src/config/db';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

function windowMs(envName: string, fallback: number): number {
  const n = Number(process.env[envName]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const POST_MATCH_WINDOW_MS = windowMs('RECOVER_POST_WINDOW_MS', 15 * 60 * 1000);
const ITEM_MATCH_WINDOW_MS = windowMs('RECOVER_ITEM_WINDOW_MS', 60 * 60 * 1000);

function publicUrl(sb: ReturnType<typeof createClient>, objectPath: string): string {
  return sb.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
}

function tsFromFilename(name: string): number | null {
  const m = /^(\d+)-[a-f0-9]+(?:\.[a-z0-9]+)?$/i.exec(name);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** Gönderi medyası: görseller + mp4 vb. + uzantısız `timestamp-hex` anahtarlar. */
function isPostMediaFilename(name: string): boolean {
  if (!name) return false;
  if (/\.(jpe?g|png|gif|webp|mp4|webm|mov|m4v|mkv|mpeg|ogv)$/i.test(name)) return true;
  return /^(\d+)-[a-f0-9]+$/i.test(name);
}

type FolderLike = { name: string };

async function listChildNames(sb: ReturnType<typeof createClient>, prefix: string): Promise<string[]> {
  const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data?.length) return [];
  return (data as FolderLike[]).map((x) => x.name).filter(Boolean);
}

async function listImagesIn(sb: ReturnType<typeof createClient>, prefix: string): Promise<{ name: string; ts: number }[]> {
  const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 500 });
  if (error || !data?.length) return [];
  const rows: { name: string; ts: number }[] = [];
  for (const raw of data as FolderLike[]) {
    const n = raw.name;
    if (!n || !/\.(jpe?g|png|gif|webp)$/i.test(n)) continue;
    const ts = tsFromFilename(n);
    if (ts === null) continue;
    rows.push({ name: n, ts });
  }
  rows.sort((a, b) => a.ts - b.ts);
  return rows;
}

/** Gönderi klasörü — video dahil (recoverPosts için). */
async function listPostMediaIn(sb: ReturnType<typeof createClient>, prefix: string): Promise<{ name: string; ts: number }[]> {
  const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 500 });
  if (error || !data?.length) return [];
  const rows: { name: string; ts: number }[] = [];
  for (const raw of data as FolderLike[]) {
    const n = raw.name;
    if (!n || !isPostMediaFilename(n)) continue;
    const ts = tsFromFilename(n);
    if (ts === null) continue;
    rows.push({ name: n, ts });
  }
  rows.sort((a, b) => a.ts - b.ts);
  return rows;
}

async function listDocsNewestFirst(sb: ReturnType<typeof createClient>, prefix: string): Promise<{ name: string; ts: number }[]> {
  const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 500 });
  if (error || !data?.length) return [];
  const rows: { name: string; ts: number }[] = [];
  for (const raw of data as FolderLike[]) {
    const n = raw.name;
    if (!n || !/\.(pdf|docx?)$/i.test(n)) continue;
    const ts = tsFromFilename(n);
    if (ts === null) continue;
    rows.push({ name: n, ts });
  }
  rows.sort((a, b) => b.ts - a.ts);
  return rows;
}

function parseCommunityKindTs(name: string): { kind: 'avatar' | 'cover'; ts: number } | null {
  const m = /^(avatar|cover)-(\d+)-/.exec(name);
  if (!m) return null;
  return { kind: m[1] as 'avatar' | 'cover', ts: Number(m[2]) };
}

async function recoverPosts(sb: ReturnType<typeof createClient>): Promise<number> {
  let count = 0;
  const child = await listChildNames(sb, 'social/posts');
  const userDirs = child.map((name) => parseInt(name, 10)).filter((x) => Number.isFinite(x));

  for (const userId of userDirs) {
    const prefix = `social/posts/${userId}`;
    const filesArr = await listPostMediaIn(sb, prefix);
    if (!filesArr.length) continue;

    const postsRows = await query<{ post_id: number; created_at: Date | string }>(
      `SELECT post_id, created_at FROM public.posts
       WHERE user_id = $1
         AND (
           image_url IS NULL OR trim(image_url::text) = ''
           OR trim(image_url::text) LIKE '/uploads/%'
           OR (
             trim(image_url::text) NOT LIKE 'http%'
             AND length(trim(image_url::text)) > 0
           )
         )
       ORDER BY created_at ASC`,
      [userId]
    );

    const postsAnchors = postsRows.map((p) => ({
      post_id: p.post_id,
      ms: new Date(p.created_at).getTime(),
    }));

    const usedFile = new Set<number>();
    const usedPost = new Set<number>();

    for (const pa of postsAnchors) {
      let bestFi = -1;
      let bestDiff = Infinity;
      filesArr.forEach((f, fi) => {
        if (usedFile.has(fi)) return;
        const d = Math.abs(f.ts - pa.ms);
        if (d > POST_MATCH_WINDOW_MS) return;
        if (d < bestDiff) {
          bestDiff = d;
          bestFi = fi;
        }
      });
      if (bestFi !== -1) {
        usedFile.add(bestFi);
        usedPost.add(pa.post_id);
        const path = `${prefix}/${filesArr[bestFi].name}`;
        await query(`UPDATE public.posts SET image_url = $1 WHERE post_id = $2`, [
          publicUrl(sb, path),
          pa.post_id,
        ]);
        count += 1;
      }
    }

    /** Kalan dosyalar için kalan postlar — ikinci bir geçiş (ters yönde eş seçimi) */
    for (let fi = 0; fi < filesArr.length; fi += 1) {
      if (usedFile.has(fi)) continue;
      let bestPid = -1;
      let bestDiff = Infinity;
      for (const pa of postsAnchors) {
        if (usedPost.has(pa.post_id)) continue;
        const d = Math.abs(filesArr[fi].ts - pa.ms);
        if (d > POST_MATCH_WINDOW_MS) continue;
        if (d < bestDiff) {
          bestDiff = d;
          bestPid = pa.post_id;
        }
      }
      if (bestPid === -1) continue;
      usedFile.add(fi);
      usedPost.add(bestPid);
      const path = `${prefix}/${filesArr[fi].name}`;
      await query(
        `UPDATE public.posts SET image_url = $1
         WHERE post_id = $2
           AND (
             image_url IS NULL OR trim(image_url::text) = ''
             OR trim(image_url::text) LIKE '/uploads/%'
             OR (
               trim(image_url::text) NOT LIKE 'http%'
               AND length(trim(image_url::text)) > 0
             )
           )`,
        [publicUrl(sb, path), bestPid]
      );
      count += 1;
    }
  }

  return count;
}

async function recoverCommunities(sb: ReturnType<typeof createClient>): Promise<number> {
  let count = 0;
  const child = await listChildNames(sb, 'communities');
  const ids = child.map((name) => parseInt(name, 10)).filter((x) => Number.isFinite(x));

  for (const communityId of ids) {
    const prefix = `communities/${communityId}`;
    const { data } = await sb.storage.from(bucket).list(prefix, { limit: 200 });
    if (!data?.length) continue;

    let bestAvatarTs = -1;
    let bestCoverTs = -1;
    let bestAvatarPath = '';
    let bestCoverPath = '';

    for (const raw of data as FolderLike[]) {
      const name = raw.name;
      if (!name || !/\.(jpe?g|png|gif|webp)$/i.test(name)) continue;
      const p = parseCommunityKindTs(name);
      if (!p) continue;
      const full = `${prefix}/${name}`;
      if (p.kind === 'avatar' && p.ts >= bestAvatarTs) {
        bestAvatarTs = p.ts;
        bestAvatarPath = full;
      }
      if (p.kind === 'cover' && p.ts >= bestCoverTs) {
        bestCoverTs = p.ts;
        bestCoverPath = full;
      }
    }

    const row = await queryOne<{ avatar_url: string | null; cover_url: string | null }>(
      'SELECT avatar_url, cover_url FROM public.communities WHERE community_id = $1',
      [communityId]
    );
    if (!row) continue;

    const avatarEmpty = !row.avatar_url || row.avatar_url.trim().length === 0;
    const coverEmpty = !row.cover_url || row.cover_url.trim().length === 0;

    if (avatarEmpty && bestAvatarPath) {
      await query(`UPDATE public.communities SET avatar_url = $1 WHERE community_id = $2`, [
        publicUrl(sb, bestAvatarPath),
        communityId,
      ]);
      count += 1;
    }
    if (coverEmpty && bestCoverPath) {
      await query(`UPDATE public.communities SET cover_url = $1 WHERE community_id = $2`, [
        publicUrl(sb, bestCoverPath),
        communityId,
      ]);
      count += 1;
    }
  }
  return count;
}

async function recoverApplicationCvs(sb: ReturnType<typeof createClient>): Promise<{ events: number; jobs: number }> {
  let events = 0;
  let jobs = 0;

  const eveDirs = await listChildNames(sb, 'applications/community-events');
  for (const sid of eveDirs.map((x) => parseInt(x, 10)).filter((x) => Number.isFinite(x))) {
    const prefix = `applications/community-events/${sid}`;
    const docs = await listDocsNewestFirst(sb, prefix);
    if (!docs.length) continue;

    const r = await queryOne<{ cv_file_url: string | null }>(
      'SELECT cv_file_url FROM public.community_event_applications WHERE event_application_id = $1',
      [sid]
    );
    const hasCv = !!(r?.cv_file_url && String(r.cv_file_url).trim().length > 0);
    if (hasCv) continue;

    const pick = docs[0];
    await query(`UPDATE public.community_event_applications SET cv_file_url = $1 WHERE event_application_id = $2`, [
      publicUrl(sb, `${prefix}/${pick.name}`),
      sid,
    ]);
    events += 1;
  }

  const jobDirs = await listChildNames(sb, 'applications/community-jobs');
  for (const jid of jobDirs.map((x) => parseInt(x, 10)).filter((x) => Number.isFinite(x))) {
    const prefix = `applications/community-jobs/${jid}`;
    const docs = await listDocsNewestFirst(sb, prefix);
    if (!docs.length) continue;

    const r = await queryOne<{ cv_file_url: string | null }>(
      'SELECT cv_file_url FROM public.community_job_applications WHERE job_application_id = $1',
      [jid]
    );
    const hasCv = !!(r?.cv_file_url && String(r.cv_file_url).trim().length > 0);
    if (hasCv) continue;

    const pick = docs[0];
    await query(`UPDATE public.community_job_applications SET cv_file_url = $1 WHERE job_application_id = $2`, [
      publicUrl(sb, `${prefix}/${pick.name}`),
      jid,
    ]);
    jobs += 1;
  }

  return { events, jobs };
}

async function recoverLostFound(sb: ReturnType<typeof createClient>, kind: 'lost' | 'found'): Promise<number> {
  let count = 0;
  const root = kind === 'lost' ? 'lost-found/lost' : 'lost-found/found';
  const imgTable = kind === 'lost' ? 'lost_item_images' : 'found_item_images';
  const itemsTable = kind === 'lost' ? 'lost_items' : 'found_items';
  const pk = kind === 'lost' ? 'lost_item_id' : 'found_item_id';
  const dateCol = kind === 'lost' ? 'lost_date' : 'found_date';
  const fk = kind === 'lost' ? 'lost_item_id' : 'found_item_id';

  const users = await listChildNames(sb, root);
  const userIds = users.map((n) => parseInt(n, 10)).filter((x) => Number.isFinite(x));

  for (const userId of userIds) {
    const prefix = `${root}/${userId}`;
    const filesArr = await listImagesIn(sb, prefix);
    if (!filesArr.length) continue;

    const items = await query<{ item_id: number; anchor_ms: number }>(
      `
      SELECT i.${pk}::int AS item_id,
             (COALESCE(EXTRACT(EPOCH FROM i.${dateCol})::bigint,
                      EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::bigint) * 1000)::bigint AS anchor_ms
      FROM public.${itemsTable} i
      WHERE i.user_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM public.${imgTable} im WHERE im.${fk} = i.${pk}
        )
      ORDER BY i.${pk} ASC`,
      [userId]
    );

    if (!items.length) continue;

    const usedFile = new Set<number>();
    const usedItem = new Set<number>();

    for (const it of items) {
      let bestFi = -1;
      let bestDiff = Infinity;
      filesArr.forEach((f, fi) => {
        if (usedFile.has(fi)) return;
        const d = Math.abs(f.ts - Number(it.anchor_ms));
        if (d > ITEM_MATCH_WINDOW_MS) return;
        if (d < bestDiff) {
          bestDiff = d;
          bestFi = fi;
        }
      });
      if (bestFi !== -1) {
        usedFile.add(bestFi);
        usedItem.add(it.item_id);
        const path = `${prefix}/${filesArr[bestFi].name}`;
        await query(`INSERT INTO public.${imgTable} (${fk}, image_url) VALUES ($1, $2)`, [
          it.item_id,
          publicUrl(sb, path),
        ]);
        count += 1;
      }
    }

    for (let fi = 0; fi < filesArr.length; fi += 1) {
      if (usedFile.has(fi)) continue;
      let bestId = -1;
      let bestDiff = Infinity;
      for (const it of items) {
        if (usedItem.has(it.item_id)) continue;
        const d = Math.abs(filesArr[fi].ts - Number(it.anchor_ms));
        if (d > ITEM_MATCH_WINDOW_MS) continue;
        if (d < bestDiff) {
          bestDiff = d;
          bestId = it.item_id;
        }
      }
      if (bestId === -1) continue;
      usedFile.add(fi);
      usedItem.add(bestId);
      const path = `${prefix}/${filesArr[fi].name}`;
      await query(`INSERT INTO public.${imgTable} (${fk}, image_url) VALUES ($1, $2)`, [
        bestId,
        publicUrl(sb, path),
      ]);
      count += 1;
    }
  }

  return count;
}

async function main(): Promise<void> {
  if (!url || !serviceKey) {
    console.error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
    process.exitCode = 1;
    return;
  }

  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log(
    `Zaman pencereleri: post=${POST_MATCH_WINDOW_MS} ms, ilan=${ITEM_MATCH_WINDOW_MS} ms (RECOVER_POST_WINDOW_MS / RECOVER_ITEM_WINDOW_MS ile değişir)\n`
  );

  console.log('Gönderi görselleri...');
  const postsN = await recoverPosts(sb);

  console.log('Topluluk görselleri...');
  const commN = await recoverCommunities(sb);

  console.log('Başvuru CV’leri...');
  const cv = await recoverApplicationCvs(sb);

  console.log('Kayıp eşya görselleri...');
  const lostN = await recoverLostFound(sb, 'lost');

  console.log('Bulunan eşya görselleri...');
  const foundN = await recoverLostFound(sb, 'found');

  console.log('\nÖzet:');
  console.log(`  posts.image_url updates...... ${postsN}`);
  console.log(`  communities media updates.... ${commN}`);
  console.log(`  event application cv......... ${cv.events}`);
  console.log(`  job application cv........... ${cv.jobs}`);
  console.log(`  lost_item_images inserts..... ${lostN}`);
  console.log(`  found_item_images inserts.... ${foundN}`);
  console.log('\nProfiller için: npm run db:recover-profile-urls');
}

void main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void closePool());
