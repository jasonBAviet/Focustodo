import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pkg;
const {
  YOUTUBE_DB_HOST,
  YOUTUBE_DB_PORT,
  YOUTUBE_DB_NAME,
  YOUTUBE_DB_USER,
  YOUTUBE_DB_PASSWORD,
} = process.env;

const youtubePool = new Pool({
  host: YOUTUBE_DB_HOST || '103.166.182.190',
  port: Number(YOUTUBE_DB_PORT) || 5432,
  database: YOUTUBE_DB_NAME || 'youtube_subtitle',
  user: YOUTUBE_DB_USER || 'n8n_inet641',
  password: YOUTUBE_DB_PASSWORD || 'n8n_inet641',
});

async function check() {
  const client = await youtubePool.connect();
  try {
    const res = await client.query(`
      SELECT id, video_id, word, ipa, type, meaning
      FROM vocabularies
      WHERE LOWER(word) LIKE '%gap%'
      ORDER BY id;
    `);
    console.log('CÁC TỪ VỰNG CHỨA GAP TRONG DB:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Lỗi truy vấn:', err);
  } finally {
    client.release();
    await youtubePool.end();
  }
}

check();
