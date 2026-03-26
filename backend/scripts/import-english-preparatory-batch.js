const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_PASSWORD = 'Yasar12345!';
const DEPARTMENT_ID = 33; // İngilizce Hazırlık Sınıfı

const staffBatch = [
  { fullName: 'Aylin Bedriye Atacan', title: 'Öğrt.Gör.', phone: '0232-570 9800' },
  { fullName: 'Buğra Çiftçi', title: 'Öğrt.Gör.', phone: '0232-570 9823' },
  { fullName: 'Dilek Arca', title: 'Öğrt.Gör.', phone: '0232-570 9834' },
  { fullName: 'Bilal Tekin', title: 'Öğrt.Gör.', phone: '0232-570 9820' },
  { fullName: 'Ceren Kuşdemir Özbilek', title: 'Dr.Öğrt.Gör.', phone: '0232-570 9829' },
  { fullName: 'Paula Cristina Neves Fiadeiro', title: 'Dr.Öğrt.Gör.', phone: '0232-570 9879' },
  { fullName: 'Ayşenur Özdemir', title: 'Dr.Öğrt.Gör.', phone: '0232-570 9914' },
  { fullName: 'Mine Özge Zure', title: 'Dr.Öğrt.Gör.', phone: '0232-570 9869' },
  { fullName: 'Yasemin Akdoğan', title: 'Öğrt.Gör.', phone: '0232-570 9844' },
  { fullName: 'Saliha Akgün Kutluışık', title: 'Öğrt.Gör.', phone: '0232-570 9882' },
  { fullName: 'Duygu Nurdan Akyürek', title: 'Öğrt.Gör.', phone: '0232-570 9874' },
  { fullName: 'Marina Alekseeva', title: 'Öğrt.Gör.', phone: '0232-570 9824' },
  { fullName: 'Derya Bademkıran', title: 'Öğrt.Gör.', phone: '0232-570 9833' },
  { fullName: 'Ceyda Basmacı', title: 'Öğrt.Gör.', phone: '0232-570 9906' },
  { fullName: 'Dila Beyazyıldırım', title: 'Öğrt.Gör.', phone: '0232-570 9913' },
  { fullName: 'Ian Stewart Collins', title: 'Öğrt.Gör.', phone: '0232-570 9804' },
  { fullName: 'Merve Çalı', title: 'Öğrt.Gör.', phone: '0232-570 9911' },
  { fullName: 'Yasemin Çelik', title: 'Öğrt.Gör.', phone: '0232-570 9918' },
  { fullName: 'Banu Demir', title: 'Öğrt.Gör.', phone: '0232-570 9813' },
  { fullName: 'Melis Demirbaş', title: 'Öğrt.Gör.', phone: '0232-570 9821' },
  { fullName: 'Özlem Devrim', title: 'Öğrt.Gör.', phone: '0232-570 9878' },
  { fullName: 'Betül Doğdu', title: 'Öğrt.Gör.', phone: '0232-570 9819' },
  { fullName: 'İlknur Elma', title: 'Öğrt.Gör.', phone: '0232-570 9861' },
  { fullName: 'Valentina Elmetti', title: 'Öğrt.Gör.', phone: '0232-570 9857' },
  { fullName: 'Beste Emül Hasırcı', title: 'Öğrt.Gör.', phone: '0232-570 9915' },
  { fullName: 'Arzu Erkol', title: 'Öğrt.Gör.', phone: '0232-570 9828' },
  { fullName: 'Cüneyt Gaffaroğlu', title: 'Öğrt.Gör.', phone: '0232-570 9830' },
  { fullName: 'Hamdiye Elif Genç', title: 'Öğrt.Gör.', phone: '0232-570 9837' },
  { fullName: 'İlknur Güler', title: 'Öğrt.Gör.', phone: '0232-570 9854' },
  { fullName: 'Elif Başak Günbay', title: 'Öğrt.Gör.', phone: '0232-570-7070' },
  { fullName: 'Huriye Jale Güneş Coşardemir', title: 'Öğrt.Gör.', phone: '0232-570 9856' },
  { fullName: 'Gamze Hısım', title: 'Öğrt.Gör.', phone: '0232-570 9840' },
  { fullName: 'Zaloa Zabala Inchaurraga', title: 'Öğrt.Gör.', phone: '0232-570 9895' },
  { fullName: 'Hatice Sevgi Irk', title: 'Öğrt.Gör.', phone: '0232-570 9848' },
  { fullName: 'Aylin Karpuzoğlu', title: 'Öğrt.Gör.', phone: '0232-570 9812' },
  { fullName: 'Melih Kazımlar', title: 'Öğrt.Gör.', phone: '0232-570 9847' },
  { fullName: 'Necati Keskin', title: 'Öğrt.Gör.', phone: '0232-570 9872' },
  { fullName: 'Özkan Koçak', title: 'Öğrt.Gör.', phone: '0232-570-7070' },
  { fullName: 'Nur Hazal Koçhan', title: 'Öğrt.Gör.', phone: '0232-570 9851' },
  { fullName: 'Çağrı Koparal', title: 'Öğrt.Gör.', phone: '0232-570-7070' },
  { fullName: 'Elvira Korukcu', title: 'Öğrt.Gör.', phone: '0232-570 9853' },
  { fullName: 'Özge Köroğlu', title: 'Öğrt.Gör.', phone: '0232-570 9877' },
  { fullName: 'Matthew Christian Larsen', title: 'Öğrt.Gör.', phone: '0232-570 9859' },
  { fullName: 'Demet Orhan Ataman', title: 'Öğrt.Gör.', phone: '0232-570 9831' },
  { fullName: 'Lisa Hanae Otani', title: 'Öğrt.Gör.', phone: '0232-570 9836' },
  { fullName: 'Zeynep Özcan Eraybat', title: 'Öğrt.Gör.', phone: '0232-570 9897' },
  { fullName: 'Sevil Özçelik', title: 'Öğrt.Gör.', phone: '0232-570 9887' },
  { fullName: 'Gizem Özgirgin', title: 'Öğrt.Gör.', phone: '0232-570 9842' },
  { fullName: 'Burcu Özkeçeci', title: 'Öğrt.Gör.', phone: '0232-570 9826' },
  { fullName: 'Eda Öztürk', title: 'Öğrt.Gör.', phone: '0232-570 9858' },
  { fullName: 'Abdullah Furkan Palabıyık', title: 'Öğrt.Gör.', phone: '0232-570 9876' },
  { fullName: 'Leonel Dario Perez', title: 'Öğrt.Gör.', phone: '0232-570-7070' },
  { fullName: 'Zeynep Sağ', title: 'Öğrt.Gör.', phone: '0232-570 9898' },
  { fullName: 'Mehmet Derviş Saltık', title: 'Öğrt.Gör.', phone: '0232-570-7070' },
  { fullName: 'Merve Sargın Bostancı', title: 'Öğrt.Gör.', phone: '0232-570 9818' },
  { fullName: 'Beyza Demet Sarıkaya', title: 'Öğrt.Gör.', phone: '0232-570 9805' },
  { fullName: 'Merve Sarıkaya Bacaksız', title: 'Öğrt.Gör.', phone: '0232-570 9867' },
  { fullName: 'Ayçe Selvi', title: 'Öğrt.Gör.', phone: '0232-570 9838' },
  { fullName: 'Zeynep Songün', title: 'Öğrt.Gör.', phone: '0232-570 9896' },
  { fullName: 'Alper Tan', title: 'Öğrt.Gör.', phone: '0232-570-7070' },
  { fullName: 'Ahmet Egemen Tanık', title: 'Öğrt.Gör.', phone: '0232-570 9810' },
  { fullName: 'Geeta Thapa Sımrooğlu', title: 'Öğrt.Gör.', phone: '0232-570 9841' },
  { fullName: 'Songül Tömek Batçıoğlu', title: 'Öğrt.Gör.', phone: '0232-570 9889' },
  { fullName: 'Nazlı Tunç Aslan', title: 'Öğrt.Gör.', phone: '0232-570 9871' },
  { fullName: 'Burcu Tügen', title: 'Öğrt.Gör.', phone: '0232-570 9806' },
  { fullName: 'Ilgın Türe', title: 'Öğrt.Gör.', phone: '0232-570 9845' },
  { fullName: 'Blair Kim Tweddle', title: 'Öğrt.Gör.', phone: '0232-570 9822' },
  { fullName: 'Filiz Pars Uçağı', title: 'Öğrt.Gör.', phone: '0232-570 9839' },
  { fullName: 'Gizem Uzundurdu', title: 'Öğrt.Gör.', phone: '0232-570 9849' },
  { fullName: 'Ekaterina Vakulenchik', title: 'Öğrt.Gör.', phone: '0232-570 9832' },
  { fullName: 'Ekin Van Den Bekerom', title: 'Öğrt.Gör.', phone: '0232-570 9835' },
  { fullName: 'Ahmet Can Yalçın', title: 'Öğrt.Gör.', phone: '0232-570 9846' },
  { fullName: 'Mehmet Deniz', title: 'Dr. Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'İlker Özbilek', title: 'Dr. Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Esma Tuğçe Tözman', title: 'Dr. Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Fatma Faize Akçay', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Deniz Ege Altınçiçek', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Merve Yıldırım', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Beste Naz Aşık', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Aysel Atmaca', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Ceren Ay', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Aslı Bıçakçı', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Efe Bir', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'David Samuel Brody', title: 'Öğrt.Gör.', phone: '0232-570 8672' },
  { fullName: 'Toygar Ege Bulut', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Onurcan Ceylan', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Faruk Cimbar', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Esra Çan', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Sude Çapat', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Pınar Çetinkaya', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Vuslat Çopuroğlu', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Nilüfer Nimet Demirel', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Batıkan Demirtaş', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Selen Eraslan', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Aybüke Erbaş', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Burcu Girengir', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Gökhan Gökçeoğlu', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Oğuz Can Güçlü', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Serdar Enis Gül', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Elifcan Koçak', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Yunus Emre Koyuncuoğlu', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Gözde Kümük', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Hüseyin Ozan Mavi', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Gülden Odabaşı', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Kemal Can Özdemir', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Nurcihan Öztürk', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Uğur Öztürk', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Gizem Parmaksız', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Damla Pehlivan', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Michele Ann Rajotte', title: 'Öğrt. Gör.', phone: '0232-570 9868' },
  { fullName: 'Buse Sarp', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Ali İhsan Saydan', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Aynur Sevin', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Şahamettin Ünsal Songün', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Özge Soyluer', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Selis Yıldız Şen', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Sezen Şenman', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Hazal Aksoy Şirin', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Dilay Turalı', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Burak Vatansever', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'İrem Nur Yılmaz', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'İdil Mellini Yumukoğlu', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
  { fullName: 'Alperen Zeytineli', title: 'Öğrt. Gör.', phone: '0232-570-7070' },
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
    const email = `${toAsciiSlug(name)}.${toAsciiSlug(surname)}.prep@yasar.edu.tr`.replace(/\.\./g, '.');

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
