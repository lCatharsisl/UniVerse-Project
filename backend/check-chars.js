process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    const r = await pool.query(`
      UPDATE users u
         SET profile_image_url = COALESCE(s.avatar_url, st.avatar_url, c.avatar_url)
        FROM users u2
   LEFT JOIN students    s  ON s.user_id  = u2.user_id
   LEFT JOIN staff       st ON st.user_id = u2.user_id
   LEFT JOIN communities c  ON c.user_id  = u2.user_id
       WHERE u.user_id = u2.user_id
         AND COALESCE(s.avatar_url, st.avatar_url, c.avatar_url) IS NOT NULL
         AND (u.profile_image_url IS DISTINCT FROM COALESCE(s.avatar_url, st.avatar_url, c.avatar_url))
      RETURNING u.user_id, u.email, u.profile_image_url
    `);
    console.log('UPDATED ROWS:', r.rowCount);
    console.log(r.rows);
  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    await pool.end();
  }
})();
