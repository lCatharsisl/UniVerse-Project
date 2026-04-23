const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  const sqlPath = path.join(
    __dirname,
    '..',
    '..',
    'migrations',
    '015_conversation_notifications_mute.sql'
  );
  const sql = fs.readFileSync(sqlPath, 'utf8');

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
  await client.query(sql);
  const check = await client.query(
    `
    SELECT a.attname
    FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid
    WHERE t.relname = 'conversation_participants'
      AND a.attname = 'notifications_muted'
      AND NOT a.attisdropped
    `
  );
  if (check.rows.length === 0) {
    throw new Error('Column conversation_participants.notifications_muted was not created.');
  }
  console.log('OK: conversation_participants.notifications_muted is present');
  await client.end();
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
