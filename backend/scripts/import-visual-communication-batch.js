const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_PASSWORD = 'Yasar12345!';
const DEPARTMENT_ID = 17; // Görsel İletişim Tasarımı

const staffBatch = [
  { fullName: 'Pelin Aytemiz Karslı', title: 'Assoc.Prof. (PhD)', phone: '0232-570 8432' },
  { fullName: 'Rıfat Hakan Ertep', title: 'Prof.Dr.', phone: '0232-570 8423' },
  { fullName: 'Duygun Erim', title: 'Assist.Prof. (PhD)', phone: '0232-570 8426' },
  { fullName: 'Doruk Türkmen', title: 'Assist.Prof. (PhD)', phone: '0232-570 8470' },
  { fullName: 'Ali Doğukan Genç', title: 'Research Assistant', phone: '0232-570 8465' },
  { fullName: 'Emir Ali Senger', title: 'Research Assistant', phone: '0232-570 8466' },
  { fullName: 'Nazlı Benlioğlu', title: 'Doç.Dr.', phone: '0232-570 8737' },
  { fullName: 'Deniz Can Taşçı', title: 'Dr. Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Kadir Kayserilioğlu', title: 'Dr. Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Maria Jose Cabezas Correa', title: 'Lecturer', phone: '0232-570 8777' },
  { fullName: 'Emre Eru', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Aslı Tekgül', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Öykü Tığlı', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Nitsa Çukurel Kapancıoğu', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
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
    const baseEmail = `${toAsciiSlug(name)}.${toAsciiSlug(surname)}.vcd@yasar.edu.tr`.replace(/\.\./g, '.');

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
