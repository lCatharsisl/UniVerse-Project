const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_PASSWORD = 'Yasar12345!';
const DEPARTMENT_ID = 3; // Elektrik-Elektronik Mühendisliği

const staffBatch = [
  { fullName: 'Mustafa Seçmen', title: 'Prof. (PhD)', phone: '0232-570 8232' },
  { fullName: 'Mustafa Gündüzalp', title: 'Prof. (PhD)', phone: '0232-570 8219' },
  { fullName: 'Volkan Rodoplu', title: 'Prof. (PhD)', phone: '0232-570 8260' },
  { fullName: 'Mesut Erol Sezer', title: 'Emeritus Prof.', phone: '0232-570-7070' },
  { fullName: 'Burhan Gülbahar', title: 'Assoc.Prof. (PhD)', phone: '0232-570 8265' },
  { fullName: 'Gökhan Demirkıran', title: 'Assoc.Prof. (PhD)', phone: '0232-570 8266' },
  { fullName: 'Mahir Kutay', title: 'Dr. Öğr. Üyesi', phone: '0232-570 8262' },
  { fullName: 'Nalan Özkurt', title: 'Assoc.Prof. (PhD)', phone: '0232-570 8244' },
  { fullName: 'Hacer Öztura', title: 'Assist.Prof. (PhD)', phone: '0232-570 8246' },
  { fullName: 'Özhan Ünverdi', title: 'Assist.Prof. (PhD)', phone: '0232-570 8245' },
  { fullName: 'Hayriye Dönmez', title: 'Research Assistant', phone: '0232-570 8361' },
  { fullName: 'Irmak Önal Korkut', title: 'Research Assistant (PhD)', phone: '0232-570 8282' },
  { fullName: 'Buse Pehlivan', title: 'Research Assistant', phone: '0232-570 8360' },
  { fullName: 'Doruk Erdemgil', title: 'Research Assistant', phone: '0232-570 8276' },
  { fullName: 'Teoman Toprakçı', title: 'Research Assistant', phone: '0232-570 8366' },
  { fullName: 'Doğan Abukay', title: 'Prof.Dr.', phone: '0232-570-7070' },
  { fullName: 'Cahit Helvacı', title: 'Prof.Dr.', phone: '0232-570-7070' },
  { fullName: 'Şahlar Meherrem', title: 'Prof. (PhD)', phone: '0232-570 9235' },
  { fullName: 'Mehmet Terziler', title: 'Emeritus Prof.', phone: '0232-570 9220' },
  { fullName: 'Esra Dalan Yıldırım', title: 'Assoc.Prof. (PhD)', phone: '0232-570 9232' },
  { fullName: 'Refet Polat', title: 'Assoc.Prof. (PhD)', phone: '0232-570 9237' },
  { fullName: 'Ahmet Yantır', title: 'Assoc.Prof. (PhD)', phone: '0232-570 9231' },
  { fullName: 'Şule Ayar Özbal', title: 'Assoc.Prof. (PhD)', phone: '0232-570 9236' },
  { fullName: 'Emrah Bıyık', title: 'Assist.Prof. (PhD)', phone: '0232-570 8250' },
  { fullName: 'Ali Haluk Nalbantoğlu', title: 'Dr. Öğr. Üyesi', phone: '0232-570-7070' },
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
    const baseEmail = `${toAsciiSlug(name)}.${toAsciiSlug(surname)}.eee@yasar.edu.tr`.replace(/\.\./g, '.');

    await client.query('BEGIN');
    try {
      let userId = null;
      const existingByEmail = await client.query('SELECT user_id FROM users WHERE email = $1', [baseEmail]);
      if (existingByEmail.rows.length) {
        userId = existingByEmail.rows[0].user_id;
      } else {
        const insertedUser = await client.query(
          `INSERT INTO users (email, password_hash, role, is_email_verified, is_active)
           VALUES ($1, $2, 'staff', true, true)
           RETURNING user_id`,
          [baseEmail, passwordHash]
        );
        userId = insertedUser.rows[0].user_id;
      }

      const staffRow = await client.query('SELECT staff_id FROM staff WHERE user_id = $1', [userId]);
      if (staffRow.rows.length) {
        await client.query(
          `UPDATE staff
           SET staff_name = $1,
               staff_surname = $2,
               department_id = $3,
               staff_title = $4,
               phone_number = $5
           WHERE user_id = $6`,
          [name, surname, DEPARTMENT_ID, person.title, person.phone, userId]
        );
      } else {
        await client.query(
          `INSERT INTO staff (user_id, staff_name, staff_surname, department_id, staff_title, phone_number)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, name, surname, DEPARTMENT_ID, person.title, person.phone]
        );
      }

      await client.query('COMMIT');
      results.push({ fullName: person.fullName, email: baseEmail, status: 'ok' });
    } catch (error) {
      await client.query('ROLLBACK');
      results.push({ fullName: person.fullName, email: baseEmail, status: 'error', error: error.message });
    }
  }

  await client.end();
  console.log(JSON.stringify(results, null, 2));
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
