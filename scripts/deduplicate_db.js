import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path'; // Đợi đã, import path từ 'path' mới đúng. Sẽ sửa lại bên dưới.
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
  connectionTimeoutMillis: 10000,
});

async function deduplicate() {
  const client = await youtubePool.connect();
  try {
    console.log('Bắt đầu dọn dẹp trùng lặp trong cơ sở dữ liệu...');
    
    // 1. Đếm số lượng từ vựng trước khi xóa
    const vocabBefore = await client.query('SELECT COUNT(*) FROM vocabularies;');
    const countVocabBefore = parseInt(vocabBefore.rows[0].count, 10);
    
    // Xóa trùng lặp từ vựng (chỉ giữ lại bản ghi có ID nhỏ nhất)
    const deleteVocabRes = await client.query(`
      DELETE FROM vocabularies a
      USING vocabularies b
      WHERE a.id > b.id 
        AND LOWER(TRIM(a.word)) = LOWER(TRIM(b.word));
    `);
    
    const vocabAfter = await client.query('SELECT COUNT(*) FROM vocabularies;');
    const countVocabAfter = parseInt(vocabAfter.rows[0].count, 10);
    const deletedVocabCount = countVocabBefore - countVocabAfter;
    console.log(`- Từ vựng: Đã xóa ${deletedVocabCount} bản ghi trùng lặp. Còn lại: ${countVocabAfter}/${countVocabBefore}.`);

    // 2. Đếm số lượng mẫu câu trước khi xóa
    const sentenceBefore = await client.query('SELECT COUNT(*) FROM sentences;');
    const countSentenceBefore = parseInt(sentenceBefore.rows[0].count, 10);
    
    // Xóa trùng lặp mẫu câu (chỉ giữ lại bản ghi có ID nhỏ nhất)
    const deleteSentenceRes = await client.query(`
      DELETE FROM sentences a
      USING sentences b
      WHERE a.id > b.id 
        AND LOWER(TRIM(a.en)) = LOWER(TRIM(b.en));
    `);
    
    const sentenceAfter = await client.query('SELECT COUNT(*) FROM sentences;');
    const countSentenceAfter = parseInt(sentenceAfter.rows[0].count, 10);
    const deletedSentenceCount = countSentenceBefore - countSentenceAfter;
    console.log(`- Mẫu câu: Đã xóa ${deletedSentenceCount} bản ghi trùng lặp. Còn lại: ${countSentenceAfter}/${countSentenceBefore}.`);

    console.log('DỌN DẸP TRÙNG LẶP DB THÀNH CÔNG!');

  } catch (err) {
    console.error('Lỗi khi thực hiện dọn dẹp database:', err);
  } finally {
    client.release();
    await youtubePool.end();
  }
}

deduplicate();
