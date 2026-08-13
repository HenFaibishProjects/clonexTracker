const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://clonex:toniliadaniel@173.249.27.44:5432/benzo',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const dbVerify = await client.query(`SELECT id, title_he, summary_he FROM news.news_items ORDER BY created_at DESC LIMIT 1`);
  console.log('Latest Record:', dbVerify.rows[0]);
  await client.end();
}
run();
