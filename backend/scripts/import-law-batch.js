const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_PASSWORD = 'Yasar12345!';
const DEPARTMENT_ID = 23; // Hukuk

const staffBatch = [
  { fullName: 'Levent Kandiller', title: 'Prof. (PhD)', phone: '0232-570 7100' },
  { fullName: 'Emine Sevcan Artun', title: 'Assist.Prof. (PhD)', phone: '0232-570 8542' },
  { fullName: 'Aslı Topukcu İduğ', title: 'Assist.Prof. (PhD)', phone: '0232-570 8567' },
  { fullName: 'Tülin Alpaslan', title: 'Secretary', phone: '0232-570 8500' },
  { fullName: 'Alev Kılıç', title: 'Secretary', phone: '0232-570 8515' },
  { fullName: 'Ali Nazım Sözer', title: 'Emeritus Prof.', phone: '0232-570 8526' },
  { fullName: 'Meral Özkan', title: 'Prof. (PhD)', phone: '0232-570 8521' },
  { fullName: 'Mustafa Ruhan Erdem', title: 'Prof. (PhD)', phone: '0232-570 8523' },
  { fullName: 'Serkan Odaman', title: 'Prof. (PhD)', phone: '0232-570 8527' },
  { fullName: 'Deniz Kızılsümer Özer', title: 'Prof. (PhD)', phone: '0232-570 8528' },
  { fullName: 'Burcu Dönmez', title: 'Prof. (PhD)', phone: '0232-570 8522' },
  { fullName: 'Bilgehan Yeşilova', title: 'Assoc.Prof. (PhD)', phone: '0232-570 8538' },
  { fullName: 'Emre Cumalıoğlu', title: 'Assoc.Prof. (PhD)', phone: '0232-570 8674' },
  { fullName: 'Sami Aksoy', title: 'Assoc.Prof. (PhD)', phone: '0232-570 8535' },
  { fullName: 'Zekiye Özen İnci Tuna', title: 'Assoc.Prof. (PhD)', phone: '0232-570 8544' },
  { fullName: 'Ali Murat Sevi', title: 'Assoc.Prof. (PhD)', phone: '0232-570 8543' },
  { fullName: 'Onur Kaplan', title: 'Assoc.Prof. (PhD)', phone: '0232-570 8541' },
  { fullName: 'Zeynep Tunca Özcan', title: 'Assist.Prof. (PhD)', phone: '0232-570 8557' },
  { fullName: 'Fehmi Kerem Bilgin', title: 'Assist.Prof. (PhD)', phone: '0232-570 8547' },
  { fullName: 'Elif Aydın Özdemir', title: 'Assist.Prof. (PhD)', phone: '0232-570 8536' },
  { fullName: 'Güven Süslü', title: 'Assist.Prof. (PhD)', phone: '0232-570 8670' },
  { fullName: 'Ekin Sökmen Güler', title: 'Assist.Prof. (PhD)', phone: '0232-570 8551' },
  { fullName: 'Muzaffer Karaaslan', title: 'Assist.Prof. (PhD)', phone: '0232-570 8560' },
  { fullName: 'Ferit Çağdaş Şahan', title: 'Assist.Prof. (PhD)', phone: '0232-570 8546' },
  { fullName: 'Yasemin Kalkancı', title: 'Assist.Prof. (PhD)', phone: '0232-570 8556' },
  { fullName: 'David Samuel Brody', title: 'Lecturer', phone: '0232-570 8672' },
  { fullName: 'Tuğba Akdemir Kamalı', title: 'Lecturer', phone: '0232-570 8540' },
  { fullName: 'Zeynep Aslı Özkan', title: 'Research Assistant', phone: '0232-570 8565' },
  { fullName: 'Burak Sarıyar', title: 'Research Assistant', phone: '0232-570 8554' },
  { fullName: 'Aslı Kabaağaçlı', title: 'Research Assistant', phone: '0232-570 8553' },
  { fullName: 'Mehmet Çağrı Avcıoğlu', title: 'Research Assistant', phone: '0232-570 8562' },
  { fullName: 'Gülhan Gezer Fehimoğlu', title: 'Research Assistant', phone: '0232-570 8558' },
  { fullName: 'Barış Arslan', title: 'Research Assistant', phone: '0232-570 8564' },
  { fullName: 'Elif Başak Yazıcı', title: 'Research Assistant', phone: '0232-570 8566' },
  { fullName: 'Sena Öbek', title: 'Research Assistant', phone: '0232-570 8563' },
  { fullName: 'İlayda Koçak', title: 'Research Assistant', phone: '0232-570 8568' },
  { fullName: 'Gökberk Öngel', title: 'Research Assistant', phone: '0232-570 8570' },
  { fullName: 'Ahmet Emre Umut', title: 'Research Assistant', phone: '0232-570 8569' },
  { fullName: 'Ceren Özgönül', title: 'Research Assistant', phone: '0232-570 8571' },
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

function uniqueByName(items) {
  const map = new Map();
  for (const item of items) {
    map.set(item.fullName.trim().toLowerCase(), item);
  }
  return Array.from(map.values());
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
  const dedupedBatch = uniqueByName(staffBatch);

  const results = [];
  for (const person of dedupedBatch) {
    const { name, surname } = splitName(person.fullName);
    const email = `${toAsciiSlug(name)}.${toAsciiSlug(surname)}.law@yasar.edu.tr`.replace(/\.\./g, '.');

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
        unique: dedupedBatch.length,
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
