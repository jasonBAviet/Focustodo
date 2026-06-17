import { youtubePool } from '../src/backend/config/youtubeDb.js';

async function runDeduplication() {
  console.log('Bat dau qua trinh loai bo trung lap du lieu (Deduplication)...');
  
  const client = await youtubePool.connect();
  try {
    await client.query('BEGIN');

    // 1. Thong ke truoc khi xoa
    const vocabCountBefore = await client.query('SELECT count(*)::int AS count FROM vocabularies');
    const sentenceCountBefore = await client.query('SELECT count(*)::int AS count FROM sentences');
    console.log(`[Thong ke ban dau] Vocabularies: ${vocabCountBefore.rows[0].count}, Sentences: ${sentenceCountBefore.rows[0].count}`);

    // 2. Lay so luong tu vung trung lap
    const vocabDupCheck = await client.query(`
      SELECT count(*)::int - count(DISTINCT lower(trim(word)))::int AS dup_count 
      FROM vocabularies
    `);
    console.log(`Phat hien ${vocabDupCheck.rows[0].dup_count} dong tu vung bi trung lap.`);

    // 3. Lay so luong mau cau trung lap
    const sentenceDupCheck = await client.query(`
      SELECT count(*)::int - count(DISTINCT lower(trim(en)))::int AS dup_count 
      FROM sentences
    `);
    console.log(`Phat hien ${sentenceDupCheck.rows[0].dup_count} dong mau cau bi trung lap.`);

    let deletedVocabs = 0;
    let deletedSentences = 0;

    // 4. Thuc thi xoa trung lap cho bang vocabularies
    if (vocabDupCheck.rows[0].dup_count > 0) {
      const vocabDeleteRes = await client.query(`
        WITH cte AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY lower(trim(word))
                   ORDER BY (CASE WHEN video_id IS NOT NULL AND video_id != '' THEN 0 ELSE 1 END),
                            created_at DESC,
                            id ASC
                 ) as rn
          FROM vocabularies
        )
        DELETE FROM vocabularies
        WHERE id IN (
          SELECT id FROM cte WHERE rn > 1
        );
      `);
      deletedVocabs = vocabDeleteRes.rowCount || 0;
      console.log(`Da xoa thanh cong ${deletedVocabs} ban ghi tu vung trung lap.`);
    }

    // 5. Thuc thi xoa trung lap cho bang sentences
    if (sentenceDupCheck.rows[0].dup_count > 0) {
      const sentenceDeleteRes = await client.query(`
        WITH cte AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY lower(trim(en))
                   ORDER BY (CASE WHEN video_id IS NOT NULL AND video_id != '' THEN 0 ELSE 1 END),
                            created_at DESC,
                            id ASC
                 ) as rn
          FROM sentences
        )
        DELETE FROM sentences
        WHERE id IN (
          SELECT id FROM cte WHERE rn > 1
        );
      `);
      deletedSentences = sentenceDeleteRes.rowCount || 0;
      console.log(`Da xoa thanh cong ${deletedSentences} ban ghi mau cau trung lap.`);
    }

    await client.query('COMMIT');

    // 6. Thong ke sau khi xoa
    const vocabCountAfter = await client.query('SELECT count(*)::int AS count FROM vocabularies');
    const sentenceCountAfter = await client.query('SELECT count(*)::int AS count FROM sentences');
    console.log(`[Thong ke sau khi xoa] Vocabularies: ${vocabCountAfter.rows[0].count}, Sentences: ${sentenceCountAfter.rows[0].count}`);
    console.log('Hoan thanh qua trinh don dep co so du lieu.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Loi khi thuc hien don dep co so du lieu:', error.message);
  } finally {
    client.release();
    await youtubePool.end();
  }
}

runDeduplication();
