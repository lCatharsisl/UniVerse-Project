const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_PASSWORD = 'Yasar12345!';

const DEPT_AGRICULTURAL_ECONOMICS = 28; // Tarım Ekonomisi
const DEPT_AGRICULTURAL_MACHINERY = 29; // Tarım Makineleri ve Teknolojileri Mühendisliği

const contributing = [
  { fullName: 'Kamil Okyay Sındır', title: 'Prof.Dr.', phone: '0232-570-7070' },
  { fullName: 'Erhan Ada', title: 'Prof.Dr.', phone: '0232-570 8923' },
  { fullName: 'Ediz Ünal', title: 'Dr. Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Gülay Özkan', title: 'Prof. (PhD)', phone: '0232-570 8343' },
  { fullName: 'Yaşar Serhat Saygılı', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
];

const economicsAndAgribusiness = [
  { fullName: 'Serpil Kaçmaz', title: 'Prof. (PhD)', phone: '0232-570 8952' },
  { fullName: 'Melisa Özbiltekin Pala', title: 'Assist.Prof. (PhD)', phone: '0232-570 8172' },
  { fullName: 'Özen Ece Acar', title: 'Assist.Prof. (PhD)', phone: '0232-570 8948' },
  { fullName: 'Pelin Atakan Ambarcı', title: 'Research Assistant', phone: '0232-570 8340' },
  ...contributing,
];

const machineryPlantSoil = [
  { fullName: 'Banu Yetkin Ekren', title: 'Assoc.Prof. (PhD)', phone: '0232-570 8230' },
  { fullName: 'Dilek Killi Haworth', title: 'Assist.Prof. (PhD)', phone: '0232-570 8344' },
  { fullName: 'Nazlı Karataş Aygün', title: 'Research Assistant', phone: '0232-570 8353' },
  { fullName: 'İsmail Türkan', title: 'Prof. (PhD)', phone: '0232-570 8300' },
  { fullName: 'Seher Yolcu', title: 'Assist.Prof. (PhD)', phone: '0232-570 8345' },
  { fullName: 'Alperen Kızılkulak', title: 'Research Assistant', phone: '0232-570 8341' },
  ...contributing,
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

async function upsertStaffForDepartment(
  client,
  person,
  departmentId,
  emailSuffix,
  passwordHash
) {
  const { name, surname } = splitName(person.fullName);
  const email = `${toAsciiSlug(name)}.${toAsciiSlug(surname)}.${emailSuffix}@yasar.edu.tr`.replace(/\.\./g, '.');

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
    [userId, departmentId]
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
      [userId, name, surname, departmentId, person.title, person.phone]
    );
  }

  return { fullName: person.fullName, email, status: 'ok' };
}

async function runDepartment(client, departmentId, label, staffList, emailSuffix, passwordHash) {
  const results = [];
  for (const person of staffList) {
    await client.query('BEGIN');
    try {
      const row = await upsertStaffForDepartment(client, person, departmentId, emailSuffix, passwordHash);
      await client.query('COMMIT');
      results.push(row);
    } catch (error) {
      await client.query('ROLLBACK');
      results.push({
        fullName: person.fullName,
        status: 'error',
        error: error.message,
      });
    }
  }
  return { departmentId, label, results };
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

  const agEcon = await runDepartment(
    client,
    DEPT_AGRICULTURAL_ECONOMICS,
    'Tarım Ekonomisi',
    economicsAndAgribusiness,
    'agrec',
    passwordHash
  );

  const agMach = await runDepartment(
    client,
    DEPT_AGRICULTURAL_MACHINERY,
    'Tarım Makineleri ve Teknolojileri Mühendisliği',
    machineryPlantSoil,
    'agrm',
    passwordHash
  );

  await client.end();

  const allResults = [agEcon, agMach];
  console.log(
    JSON.stringify(
      {
        note:
          'Plant & Soil section mapped to dept 29 (no separate dept in DB). Contributing staff added to both 28 and 29.',
        departments: allResults.map((d) => ({
          ...d,
          success: d.results.filter((r) => r.status === 'ok').length,
          failed: d.results.filter((r) => r.status !== 'ok').length,
        })),
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
