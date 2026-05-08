const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  const sqlPath = path.join(__dirname, '..', '..', 'migrations', '022_community_event_poster.sql');
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
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'community_events'
       AND column_name = 'poster_url'`
  );
  console.log('poster_url column:', check.rows.length ? 'present' : 'MISSING');
  await client.end();
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
