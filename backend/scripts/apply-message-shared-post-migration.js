const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  const sqlPath = path.join(__dirname, '..', '..', 'migrations', '021_message_shared_post.sql');
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
  const check = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'shared_post_id'
  `);
  console.log('shared_post_id column:', check.rows[0] ? 'ok' : 'missing');
  await client.end();
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
