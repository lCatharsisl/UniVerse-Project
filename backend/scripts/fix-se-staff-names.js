const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const updates = [
  { email: 'aybuke.kanmaz.se@yasar.edu.tr', staff_name: 'Aybüke Keçeci', staff_surname: 'Kanmaz' },
  { email: 'baris.yildiz.se@yasar.edu.tr', staff_name: 'Barış', staff_surname: 'Yıldız' },
  { email: 'baris.ceyhan.se@yasar.edu.tr', staff_name: 'Barış', staff_surname: 'Ceyhan' },
  { email: 'burak.yalinat.se@yasar.edu.tr', staff_name: 'Burak', staff_surname: 'Yalınat' },
  { email: 'cem.sahin.se@yasar.edu.tr', staff_name: 'Cem Doğan', staff_surname: 'Şahin' },
  { email: 'deniz.ozsoyeller.se@yasar.edu.tr', staff_name: 'Deniz', staff_surname: 'Özsoyeller' },
  { email: 'dindar.oz.se@yasar.edu.tr', staff_name: 'Dindar', staff_surname: 'Öz' },
  { email: 'ilhan.sofuoglu.se@yasar.edu.tr', staff_name: 'İlhan', staff_surname: 'Sofuoğlu' },
  { email: 'kazim.erdogdu.se@yasar.edu.tr', staff_name: 'Kazım', staff_surname: 'Erdoğdu' },
  { email: 'mehmet.unluturk.se@yasar.edu.tr', staff_name: 'Mehmet Süleyman', staff_surname: 'Ünlütürk' },
  { email: 'oral.yalcinpinar.se@yasar.edu.tr', staff_name: 'Oral', staff_surname: 'Yalçınpınar' },
  { email: 'suphi.ucar.se@yasar.edu.tr', staff_name: 'Suphi', staff_surname: 'Uçar' },
  { email: 'atabaris.ayaydin.se@yasar.edu.tr', staff_name: 'Atabarış', staff_surname: 'Ayaydın' },
  { email: 'umut.avci.se@yasar.edu.tr', staff_name: 'Umut', staff_surname: 'Avcı' },
];

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
  for (const item of updates) {
    await client.query(
      `UPDATE staff s
       SET staff_name = $1, staff_surname = $2
       FROM users u
       WHERE s.user_id = u.user_id
         AND u.email = $3`,
      [item.staff_name, item.staff_surname, item.email]
    );
  }
  await client.end();
  console.log(`Updated ${updates.length} staff profiles.`);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
