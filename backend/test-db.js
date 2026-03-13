const { Client } = require('pg');

async function test(url, name) {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3000 });
  try {
    console.log(`Connecting to ${name}...`);
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`${name} SUCCESS: ${res.rows[0].now}`);
    await client.end();
  } catch (err) {
    console.log(`${name} ERROR:`, err.message);
  }
}

async function run() {
  const p1 = "postgresql://postgres.zdzkpuvqgkyqvaajkewy:UniVerse2024xyz@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?sslmode=require";
  const p2 = "postgresql://postgres.zdzkpuvqgkyqvaajkewy:UniVerse2024xyz@aws-1-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require";
  const p3 = "postgresql://postgres:UniVerse2024xyz@db.zdzkpuvqgkyqvaajkewy.supabase.co:5432/postgres?sslmode=require";
  await Promise.all([
    test(p1, "Pooler 6543"),
    test(p2, "Pooler 5432"),
    test(p3, "Direct 5432")
  ]);
}

run();
