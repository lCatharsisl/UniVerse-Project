const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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
  await client.query('BEGIN');

  const sourceDepartment = 26; // Grafik Tasarımı (Lisans)
  const targetDepartment = 36; // Grafik Tasarımı (Önlisans)

  const users = await client.query('SELECT user_id FROM staff WHERE department_id = $1', [sourceDepartment]);

  let inserted = 0;
  for (const row of users.rows) {
    const existing = await client.query(
      'SELECT staff_id FROM staff WHERE user_id = $1 AND department_id = $2',
      [row.user_id, targetDepartment]
    );
    if (existing.rows.length) continue;

    const src = await client.query(
      `SELECT staff_name, staff_surname, staff_title, phone_number, office_id, office_hours,
              avatar_url, cover_url, description, social_links, interests
       FROM staff
       WHERE user_id = $1 AND department_id = $2
       LIMIT 1`,
      [row.user_id, sourceDepartment]
    );
    if (!src.rows.length) continue;

    const s = src.rows[0];
    await client.query(
      `INSERT INTO staff
        (user_id, staff_name, staff_surname, department_id, staff_title, phone_number,
         office_id, office_hours, avatar_url, cover_url, description, social_links, interests)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        row.user_id,
        s.staff_name,
        s.staff_surname,
        targetDepartment,
        s.staff_title,
        s.phone_number,
        s.office_id,
        s.office_hours,
        s.avatar_url,
        s.cover_url,
        s.description,
        s.social_links,
        s.interests,
      ]
    );
    inserted += 1;
  }

  await client.query('COMMIT');
  await client.end();

  console.log(
    JSON.stringify(
      {
        sourceDepartment,
        targetDepartment,
        sourceCount: users.rows.length,
        inserted,
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
