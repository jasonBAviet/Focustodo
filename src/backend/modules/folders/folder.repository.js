import { pool } from '../../../../db.js';

export class FolderRepository {
  async getFolders(userId) {
    const r = await pool.query(
      'SELECT * FROM folders WHERE user_id = $1 AND (is_deleted = false OR is_deleted IS NULL) ORDER BY position ASC, created_at ASC',
      [userId]
    );
    return r.rows;
  }

  async getFolderById(id, userId) {
    const r = await pool.query(
      'SELECT * FROM folders WHERE id = $1 AND user_id = $2 AND (is_deleted = false OR is_deleted IS NULL)',
      [id, userId]
    );
    return r.rows[0];
  }

  async getNextPosition(userId, client) {
    const q = client || pool;
    const posQ = await q.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM folders WHERE user_id = $1 AND (is_deleted = false OR is_deleted IS NULL)',
      [userId]
    );
    return posQ.rows[0].pos;
  }

  async createFolder(folder, userId, client) {
    const q = client || pool;
    const r = await q.query(
      `INSERT INTO folders (id, name, color, project_ids, parent_id, position, is_visible, created_at, updated_at, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9) RETURNING *`,
      [folder.id, folder.name, folder.color, JSON.stringify(folder.projectIds), folder.parentId, folder.position, folder.isVisible, folder.now, userId]
    );
    return r.rows[0];
  }

  async updateFolder(id, userId, updated) {
    const r = await pool.query(
      `UPDATE folders SET name=$1, color=$2, project_ids=$3, parent_id=$4, position=$5, is_visible=$6, updated_at=$7 
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [
        updated.name, updated.color, JSON.stringify(updated.projectIds), updated.parentId,
        updated.position, updated.isVisible, updated.updatedAt, id, userId
      ]
    );
    return r.rows[0];
  }

  async reorderFolders(userId, orderedIds, client) {
    const q = client || pool;
    const now = new Date().toISOString();
    for (let i = 0; i < orderedIds.length; i++) {
      await q.query(
        'UPDATE folders SET position = $1, updated_at = $2 WHERE id = $3 AND user_id = $4',
        [i, now, orderedIds[i], userId]
      );
    }
  }

  async deleteFolder(id, userId, now, client) {
    const q = client || pool;
    const r = await q.query(
      'UPDATE folders SET is_deleted = true, updated_at = $2 WHERE id = $1 AND user_id = $3 AND (is_deleted = false OR is_deleted IS NULL) RETURNING id',
      [id, now, userId]
    );
    return r.rows[0];
  }

  async nullifyFolderInProjects(id, userId, now, client) {
    const q = client || pool;
    await q.query('UPDATE projects SET folder_id = NULL, updated_at = $2 WHERE folder_id = $1 AND user_id = $3', [id, now, userId]);
  }

  async nullifyFolderInFolders(id, userId, now, client) {
    const q = client || pool;
    await q.query('UPDATE folders SET parent_id = NULL, updated_at = $2 WHERE parent_id = $1 AND user_id = $3', [id, now, userId]);
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

export const folderRepository = new FolderRepository();
