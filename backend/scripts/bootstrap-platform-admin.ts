/**
 * Platform yöneticisi hesabını `users.role = admin` + `admins` satırına bağlar.
 * E-posta: `PLATFORM_ADMIN_EMAIL` (varsayılan admin@yasar.edu.tr)
 *
 * - Kullanıcı yoksa: env `BOOTSTRAP_PLATFORM_ADMIN_PASSWORD` zorunlu (hash’lenir).
 * - Kullanıcı varsa: rolü admin yapar, admins kaydını tamamlar (parola değiştirmez).
 *
 *   npm run db:bootstrap-platform-admin
 */
import '../src/config/loadDotenv';
import bcrypt from 'bcryptjs';
import { closePool, query, queryOne } from '../src/config/db';
import { getPlatformAdminEmail } from '../src/security/platformAdmin';

const SALT_ROUNDS = 10;

async function main() {
  const email = getPlatformAdminEmail();
  const pw = process.env.BOOTSTRAP_PLATFORM_ADMIN_PASSWORD?.trim();

  const existing = await queryOne<{ user_id: number }>(
    'SELECT user_id FROM public.users WHERE lower(email) = lower($1)',
    [email]
  );

  let userId: number;

  if (!existing) {
    if (!pw || pw.length < 8) {
      console.error(
        'Yeni yönetici oluşturulacak: backend/.env veya ortamda BOOTSTRAP_PLATFORM_ADMIN_PASSWORD tanımlayın (en az 8 karakter).'
      );
      process.exitCode = 1;
      return;
    }
    const passwordHash = await bcrypt.hash(pw, SALT_ROUNDS);
    const row = await queryOne<{ user_id: number }>(
      `INSERT INTO public.users (email, password_hash, role, is_email_verified, is_active)
       VALUES ($1, $2, 'admin', true, true)
       RETURNING user_id`,
      [email, passwordHash]
    );
    if (!row) throw new Error('INSERT users failed');
    userId = row.user_id;
    console.log(`Yeni platform yöneticisi oluşturuldu: user_id=${userId}`);
  } else {
    userId = existing.user_id;
    await query(`UPDATE public.users SET role = 'admin', is_active = true WHERE user_id = $1`, [userId]);
    console.log(`Mevcut kullanıcı admin rolüne yükseltildi: user_id=${userId}`);
  }

  const adminRow = await queryOne<{ user_id: number }>(
    'SELECT user_id FROM public.admins WHERE user_id = $1',
    [userId]
  );
  if (!adminRow) {
    await query(
      `INSERT INTO public.admins (user_id, admin_name, admin_surname) VALUES ($1, $2, $3)`,
      [userId, 'Platform', 'Administrator']
    );
    console.log('admins tablosuna kayıt eklendi.');
  } else {
    console.log('admins kaydı zaten vardı.');
  }

  console.log(`Tamam. Giriş e-postası: ${email}`);
  if (existing) {
    console.log(
      'Parolayı uygulamada Profil / şifre değiştir ile güncelleyin; bu e-posta için güçlü şifre politikası uygulanır.'
    );
  }
}

void main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void closePool());
