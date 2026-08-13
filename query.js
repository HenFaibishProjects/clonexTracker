const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://clonex:toniliadaniel@173.249.27.44:5432/benzo',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT * FROM news.news_item_topics WHERE news_item_id = '2'");
  console.log('news_item_topics:', res.rows);
  const item = await client.query("SELECT id, feed_id FROM news.news_items WHERE id = '2'");
  console.log('news_item feed_id:', item.rows[0].feed_id);
  await client.end();
}
run();
