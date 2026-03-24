const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_PASSWORD = 'Yasar12345!';
const DEPARTMENT_ID = 44; // Turizm ve Otel İşletmeciliği

const staffBatch = [
  { fullName: 'Feride Deniz Zaptcıoğlu Çelikde', title: 'Assist. Prof.(Phd)', phone: '0232-570 8630' },
  { fullName: 'Sabah Balta Ulay', title: 'Prof. (PhD)', phone: '0232-570 8656' },
  { fullName: 'İrem Enser', title: 'Lecturer (PhD)', phone: '0232-570 8654' },
  { fullName: 'Gökhan Doğan', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Özgün Can', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
];

function toAsciiSlug(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '.');
}

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { name: parts[0], surname: parts[0] };
  return {
    name: parts.slice(0, -1).join(' '),
    surname: parts[parts.length - 1],
  };
}

async function findUserId(client, fullName, generatedEmail) {
  const byName = await client.query(
    `SELECT s.user_id
     FROM staff s
     WHERE LOWER(TRIM(CONCAT(s.staff_name, ' ', s.staff_surname))) = LOWER($1)
     ORDER BY s.staff_id ASC
     LIMIT 1`,
    [fullName.trim()]
  );
  if (byName.rows.length) return byName.rows[0].user_id;

  const byEmail = await client.query('SELECT user_id FROM users WHERE email = $1', [generatedEmail]);
  if (byEmail.rows.length) return byEmail.rows[0].user_id;

  return null;
}

async function run() {
  const client = new Client(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
      : {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          ssl: { rejectUnauthorized: false },
        }
  );

  await client.connect();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const results = [];
  for (const person of staffBatch) {
    const { name, surname } = splitName(person.fullName);
    const email = `${toAsciiSlug(name)}.${toAsciiSlug(surname)}.thm@yasar.edu.tr`.replace(/\.\./g, '.');

    await client.query('BEGIN');
    try {
      let userId = await findUserId(client, person.fullName, email);
      if (!userId) {
        const insertedUser = await client.query(
          `INSERT INTO users (email, password_hash, role, is_email_verified, is_active)
           VALUES ($1, $2, 'staff', true, true)
           RETURNING user_id`,
          [email, passwordHash]
        );
        userId = insertedUser.rows[0].user_id;
      }

      const existingStaff = await client.query(
        'SELECT staff_id FROM staff WHERE user_id = $1 AND department_id = $2 LIMIT 1',
        [userId, DEPARTMENT_ID]
      );

      if (existingStaff.rows.length) {
        await client.query(
          `UPDATE staff
           SET staff_name = $1,
               staff_surname = $2,
               staff_title = $3,
               phone_number = $4
           WHERE staff_id = $5`,
          [name, surname, person.title, person.phone, existingStaff.rows[0].staff_id]
        );
      } else {
        await client.query(
          `INSERT INTO staff (user_id, staff_name, staff_surname, department_id, staff_title, phone_number)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, name, surname, DEPARTMENT_ID, person.title, person.phone]
        );
      }

      await client.query('COMMIT');
      results.push({ fullName: person.fullName, email, status: 'ok' });
    } catch (error) {
      await client.query('ROLLBACK');
      results.push({ fullName: person.fullName, email, status: 'error', error: error.message });
    }
  }

  await client.end();
  console.log(
    JSON.stringify(
      {
        departmentId: DEPARTMENT_ID,
        requested: staffBatch.length,
        success: results.filter((r) => r.status === 'ok').length,
        failed: results.filter((r) => r.status !== 'ok').length,
        results,
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
