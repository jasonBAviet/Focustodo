import { pool } from '../../../../db.js';
import { youtubePool } from '../../config/youtubeDb.js';

export class LearningRepository {
  /**
   * Lấy danh sách từ vựng đã được chuẩn hóa và loại bỏ trùng lặp.
   */
  async getVocabularies() {
    const queryStr = `
      SELECT v.id, v.video_id, v.word, v.ipa, v.type, v.meaning, v.context, v.explanation, v.created_at,
             t.video_url, t.topic, t.domain
      FROM vocabularies v
      LEFT JOIN (
        SELECT DISTINCT ON (video_id) video_id, video_url, topic, domain 
        FROM translation_history
        WHERE video_id IS NOT NULL AND video_id != ''
      ) t ON v.video_id = t.video_id
      ORDER BY v.created_at DESC;
    `;
    const result = await youtubePool.query(queryStr);
    return result.rows;
  }

  /**
   * Lấy danh sách mẫu câu đã được chuẩn hóa và loại bỏ trùng lặp.
   */
  async getSentences() {
    const queryStr = `
      SELECT s.id, s.video_id, s.en, s.vi, s.point, s.created_at,
             t.video_url, t.topic, t.domain
      FROM sentences s
      LEFT JOIN (
        SELECT DISTINCT ON (video_id) video_id, video_url, topic, domain 
        FROM translation_history
        WHERE video_id IS NOT NULL AND video_id != ''
      ) t ON s.video_id = t.video_id
      ORDER BY s.created_at DESC;
    `;
    const result = await youtubePool.query(queryStr);
    return result.rows;
  }

  /**
   * Lấy toàn bộ trạng thái học tập của người dùng hiện tại từ cơ sở dữ liệu cục bộ.
   */
  async getUserLearningStates(userId) {
    const queryStr = `
      SELECT id, item_type, status 
      FROM user_learning_states 
      WHERE user_id = $1;
    `;
    const result = await pool.query(queryStr, [userId]);
    return result.rows;
  }

  /**
   * Lưu hoặc cập nhật trạng thái học tập của người dùng cho một từ vựng hoặc mẫu câu.
   */
  async markLearningState(userId, itemId, itemType, status) {
    const now = new Date().toISOString();
    const queryStr = `
      INSERT INTO user_learning_states (id, user_id, item_type, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $5)
      ON CONFLICT (id) 
      DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
      RETURNING *;
    `;
    const result = await pool.query(queryStr, [itemId, userId, itemType, status, now]);
    return result.rows[0];
  }
}

export const learningRepository = new LearningRepository();
