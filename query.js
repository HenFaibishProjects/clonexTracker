const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://clonex:toniliadaniel@173.249.27.44:5432/benzo',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
    const result = await client.query(`
SELECT
    id,
    published_at,
    display_week_start,
    pg_typeof(display_week_start)
FROM news.news_items
ORDER BY id DESC
LIMIT 10;
    `);
    console.log('Result:', result.rows);
  await client.end();
}
run();
