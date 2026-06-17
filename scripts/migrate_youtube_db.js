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

async function bulkInsertVocabularies(client, items) {
  if (items.length === 0) return;
  const chunkSize = 200;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const valuePlaceholders = [];
    const flatValues = [];
    let paramIndex = 1;
    for (const item of chunk) {
      valuePlaceholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7})`);
      flatValues.push(
        item.video_id,
        item.word,
        item.ipa,
        item.type,
        item.meaning,
        item.context,
        item.explanation,
        item.family_words
      );
      paramIndex += 8;
    }
    const query = `
      INSERT INTO vocabularies (video_id, word, ipa, type, meaning, context, explanation, family_words)
      VALUES ${valuePlaceholders.join(', ')}
    `;
    await client.query(query, flatValues);
  }
}

async function bulkInsertSentences(client, items) {
  if (items.length === 0) return;
  const chunkSize = 200;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const valuePlaceholders = [];
    const flatValues = [];
    let paramIndex = 1;
    for (const item of chunk) {
      valuePlaceholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3})`);
      flatValues.push(
        item.video_id,
        item.en,
        item.vi,
        item.point
      );
      paramIndex += 4;
    }
    const query = `
      INSERT INTO sentences (video_id, en, vi, point)
      VALUES ${valuePlaceholders.join(', ')}
    `;
    await client.query(query, flatValues);
  }
}

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
        family_words JSONB DEFAULT '[]'::jsonb,
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

    const vocabulariesToInsert = [];
    const sentencesToInsert = [];

    for (const row of res.rows) {
      let data;
      try {
        data = JSON.parse(row.translated_text);
      } catch (e) {
        continue;
      }

      const videoId = row.video_id;

      // Gom Từ vựng
      if (Array.isArray(data.vocabulary)) {
        for (const item of data.vocabulary) {
          if (!item.word) continue;
          const familyWords = Array.isArray(item.family_words) ? item.family_words : [];
          vocabulariesToInsert.push({
            video_id: videoId,
            word: item.word.trim(),
            ipa: item.ipa || '',
            type: item.type || '',
            meaning: item.meaning || '',
            context: item.context || '',
            explanation: item.explanation || '',
            family_words: JSON.stringify(familyWords)
          });
        }
      }

      // Gom Mẫu câu
      if (Array.isArray(data.sentences)) {
        for (const item of data.sentences) {
          if (!item.en) continue;
          sentencesToInsert.push({
            video_id: videoId,
            en: item.en.trim(),
            vi: item.vi || '',
            point: item.point || ''
          });
        }
      }
    }

    console.log(`- Gom thành công: ${vocabulariesToInsert.length} từ vựng và ${sentencesToInsert.length} mẫu câu.`);
    console.log('4. Thực hiện chèn dữ liệu bulk...');
    
    await bulkInsertVocabularies(client, vocabulariesToInsert);
    await bulkInsertSentences(client, sentencesToInsert);

    await client.query('COMMIT');
    console.log(`MIGRATION THÀNH CÔNG!`);
    console.log(`- Tổng số từ vựng đã chuyển đổi: ${vocabulariesToInsert.length}`);
    console.log(`- Tổng số mẫu câu đã chuyển đổi: ${sentencesToInsert.length}`);

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Lỗi khi thực hiện migration:', err);
  } finally {
    client.release();
    await youtubePool.end();
  }
}

migrate();
