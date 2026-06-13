import { pool } from '../../../../db.js';

export class TagRepository {
  async getTags(userId) {
    const r = await pool.query(
      'SELECT * FROM tags WHERE user_id = $1 AND (is_deleted = false OR is_deleted IS NULL) ORDER BY created_at ASC',
      [userId]
    );
    return r.rows;
  }

  async getTagById(id, userId) {
    const r = await pool.query(
      'SELECT * FROM tags WHERE id = $1 AND user_id = $2 AND (is_deleted = false OR is_deleted IS NULL)',
      [id, userId]
    );
    return r.rows[0];
  }

  async createTag(tag, userId) {
    const r = await pool.query(
      `INSERT INTO tags (id, name, color, project_id, folder_id, is_visible, created_at, updated_at, user_id) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8) RETURNING *`,
      [tag.id, tag.name, tag.color, tag.projectId, tag.folderId, tag.isVisible, tag.now, userId]
    );
    return r.rows[0];
  }

  async updateTag(id, userId, updated) {
    const r = await pool.query(
      `UPDATE tags SET name=$1, color=$2, project_id=$3, folder_id=$4, is_visible=$5, updated_at=$6 
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [updated.name, updated.color, updated.projectId, updated.folderId, updated.isVisible, updated.updatedAt, id, userId]
    );
    return r.rows[0];
  }

  async deleteTag(id, userId, now, client) {
    const q = client || pool;
    const r = await q.query(
      'UPDATE tags SET is_deleted = true, updated_at = $2 WHERE id = $1 AND user_id = $3 AND (is_deleted = false OR is_deleted IS NULL) RETURNING id',
      [id, now, userId]
    );
    return r.rows[0];
  }

  async removeTagFromTasks(id, userId, now, client) {
    const q = client || pool;
    await q.query(
      `UPDATE tasks SET tags = COALESCE(tags,'[]'::jsonb) - $1, updated_at = $2
       WHERE tags @> to_jsonb($1::text) AND user_id = $3`,
      [id, now, userId]
    );
  }

  async runInTransaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}

export const tagRepository = new TagRepository();
