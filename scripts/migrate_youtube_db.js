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

// Kết nối trực tiếp với DB youtube_subtitle bằng quyền ghi
const youtubePool = new Pool({
  host: YOUTUBE_DB_HOST || '103.166.182.190',
  port: Number(YOUTUBE_DB_PORT) || 5432,
  database: YOUTUBE_DB_NAME || 'youtube_subtitle',
  user: YOUTUBE_DB_USER || 'n8n_inet641',
  password: YOUTUBE_DB_PASSWORD || 'n8n_inet641',
  connectionTimeoutMillis: 10000,
});

async function migrate() {
  const client = await youtubePool.connect();
  try {
    console.log('1. Khởi tạo cấu trúc các bảng mới...');
    
    // Drop các bảng cũ nếu đã tồn tại để tránh sai schema
    await client.query('DROP TABLE IF EXISTS vocabularies, sentences CASCADE;');

    // Tạo bảng vocabularies
    await client.query(`

      CREATE TABLE IF NOT EXISTS vocabularies (
        id SERIAL PRIMARY KEY,
        video_id VARCHAR(255),
        word VARCHAR(255) NOT NULL,
        ipa VARCHAR(255),
        type VARCHAR(100),
        meaning TEXT,
        context TEXT,
        explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_vocabularies_video_id ON vocabularies(video_id);
      CREATE INDEX IF NOT EXISTS idx_vocabularies_word ON vocabularies(word);
    `);
    console.log('- Đã tạo bảng vocabularies.');

    // Tạo bảng sentences
    await client.query(`
      CREATE TABLE IF NOT EXISTS sentences (
        id SERIAL PRIMARY KEY,
        video_id VARCHAR(255),
        en TEXT NOT NULL,
        vi TEXT,
        point TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sentences_video_id ON sentences(video_id);
    `);


    console.log('- Đã tạo bảng sentences.');

    console.log('2. Đọc dữ liệu dịch thuật hiện tại từ translation_history...');
    const res = await client.query(`
      SELECT video_id, translated_text 
      FROM translation_history 
      WHERE translated_text IS NOT NULL AND translated_text != '';
    `);
    
    console.log(`- Tìm thấy ${res.rows.length} bản ghi video dịch thuật.`);
    console.log('3. Bắt đầu di chuyển dữ liệu...');

    await client.query('BEGIN');

    // Xóa dữ liệu cũ trong bảng đích trước khi di cư để tránh trùng lặp
    await client.query('TRUNCATE TABLE vocabularies RESTART IDENTITY CASCADE;');
    await client.query('TRUNCATE TABLE sentences RESTART IDENTITY CASCADE;');

    let vocabCount = 0;
    let sentenceCount = 0;

    for (const row of res.rows) {
      let data;
      try {
        data = JSON.parse(row.translated_text);
      } catch (e) {
        continue;
      }

      const videoId = row.video_id;

      // Di cư Từ vựng
      if (Array.isArray(data.vocabulary)) {
        for (const item of data.vocabulary) {
          if (!item.word) continue;
          await client.query(`
            INSERT INTO vocabularies (video_id, word, ipa, type, meaning, context, explanation)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            videoId, 
            item.word.trim(), 
            item.ipa || '', 
            item.type || '', 
            item.meaning || '', 
            item.context || '', 
            item.explanation || ''
          ]);
          vocabCount++;
        }
      }

      // Di cư Mẫu câu
      if (Array.isArray(data.sentences)) {
        for (const item of data.sentences) {
          if (!item.en) continue;
          await client.query(`
            INSERT INTO sentences (video_id, en, vi, point)
            VALUES ($1, $2, $3, $4)
          `, [
            videoId, 
            item.en.trim(), 
            item.vi || '', 
            item.point || ''
          ]);
          sentenceCount++;
        }
      }
    }

    await client.query('COMMIT');
    console.log(`MIGRATION THÀNH CÔNG!`);
    console.log(`- Tổng số từ vựng đã chuyển đổi: ${vocabCount}`);
    console.log(`- Tổng số mẫu câu đã chuyển đổi: ${sentenceCount}`);

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Lỗi khi thực hiện migration:', err);
  } finally {
    client.release();
    await youtubePool.end();
  }
}

migrate();
