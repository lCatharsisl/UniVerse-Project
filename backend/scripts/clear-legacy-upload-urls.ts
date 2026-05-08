/**
 * Eski yerel disk medya yollarını DB'den temizler (artık servis edilmeyen `/uploads/...`
 * ve içinde `/uploads/` geçen tam URL'ler). Supabase public URL'leri eşleşmez, dokunulmaz.
 *
 * Kullanım: npx tsx scripts/clear-legacy-upload-urls.ts
 */
import '../src/config/loadDotenv';
import { getPool, closePool } from '../src/config/db';

function legacy(column: string): string {
  return `(
    ${column} IS NOT NULL
    AND (
      ${column} LIKE '/uploads/%'
      OR (
        ${column} LIKE '%/uploads/%'
        AND ${column} NOT ILIKE '%.supabase.co%'
      )
    )
  )`;
}

type Step = { label: string; sql: string };

const steps: Step[] = [
  { label: 'users.profile_image_url', sql: `UPDATE public.users SET profile_image_url = NULL WHERE ${legacy('profile_image_url')}` },
  { label: 'students.avatar_url', sql: `UPDATE public.students SET avatar_url = NULL WHERE ${legacy('avatar_url')}` },
  { label: 'students.cover_url', sql: `UPDATE public.students SET cover_url = NULL WHERE ${legacy('cover_url')}` },
  { label: 'staff.avatar_url', sql: `UPDATE public.staff SET avatar_url = NULL WHERE ${legacy('avatar_url')}` },
  { label: 'staff.cover_url', sql: `UPDATE public.staff SET cover_url = NULL WHERE ${legacy('cover_url')}` },
  { label: 'communities.avatar_url', sql: `UPDATE public.communities SET avatar_url = NULL WHERE ${legacy('avatar_url')}` },
  { label: 'communities.cover_url', sql: `UPDATE public.communities SET cover_url = NULL WHERE ${legacy('cover_url')}` },
  { label: 'posts.image_url', sql: `UPDATE public.posts SET image_url = NULL WHERE ${legacy('image_url')}` },
  { label: 'community_job_applications.cv_file_url', sql: `UPDATE public.community_job_applications SET cv_file_url = NULL WHERE ${legacy('cv_file_url')}` },
  {
    label: 'community_event_applications.cv_file_url',
    sql: `UPDATE public.community_event_applications SET cv_file_url = NULL WHERE ${legacy('cv_file_url')}`,
  },
  { label: 'lost_item_images', sql: `DELETE FROM public.lost_item_images WHERE ${legacy('image_url')}` },
  { label: 'found_item_images', sql: `DELETE FROM public.found_item_images WHERE ${legacy('image_url')}` },
  { label: 'message_attachments', sql: `DELETE FROM public.message_attachments WHERE ${legacy('file_url')}` },
];

async function main() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const summary: { label: string; rowCount: number }[] = [];
    for (const { label, sql } of steps) {
      const r = await client.query(sql);
      summary.push({ label, rowCount: r.rowCount ?? 0 });
    }
    await client.query('COMMIT');
    console.log('Legacy /uploads/ references cleared:\n');
    for (const s of summary) {
      console.log(`  ${s.label}: ${s.rowCount} row(s)`);
    }
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
}

void main();
